import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import Measure from '../models/Measure';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

export const uploadMeasure = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error_code: 'INVALID_DATA',
            error_description: errors.array().map(err => err.msg).join(', '),
        });
    }

    const { image, customer_code, measure_datetime, measure_type } = req.body;

    try {
        const measureDate = new Date(measure_datetime);
        const monthStart = new Date(measureDate.getFullYear(), measureDate.getMonth(), 1);

        const existingMeasure = await Measure.findOne({
            where: {
                customer_code,
                measure_type,
                measure_datetime: {
                    [Op.gte]: monthStart,
                },
            },
        });

        if (existingMeasure) {
            return res.status(409).json({
                error_code: 'DOUBLE_REPORT',
                error_description: 'Leitura do mês já realizada',
            });
        }

        let imageBuffer;
        try {
            imageBuffer = Buffer.from(image, 'base64');
        } catch (e) {
            return res.status(400).json({ error_code: 'INVALID_IMAGE', error_description: 'A imagem fornecida é inválida.' });
        }

        const tempDirPath = path.join(__dirname, '../temp');
        const tempFilePath = path.join(tempDirPath, `${customer_code}-${Date.now()}.jpg`);

        if (!fs.existsSync(tempDirPath)) {
            fs.mkdirSync(tempDirPath, { recursive: true });
        }

        fs.writeFileSync(tempFilePath, imageBuffer);

        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
            mimeType: 'image/jpeg',
            displayName: `measure-${customer_code}-${Date.now()}`,
        });

        const tempImageUrl = uploadResponse.file.uri;

        const fileToGenerativePart = (filePath: string, mimeType: string) => ({
            inlineData: {
                data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
                mimeType,
            },
        });

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const imageParts = [fileToGenerativePart(tempFilePath, 'image/jpeg')];
        const prompt = 'Extract the numeric value from the image.';

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const measureValue = parseInt(response.text(), 10);

        fs.unlinkSync(tempFilePath);

        const newMeasure = await Measure.create({
            measure_uuid: `measure-${Date.now()}`,
            customer_code,
            measure_datetime,
            measure_type,
            measure_value: measureValue,
            image_url: tempImageUrl,
            has_confirmed: false,
        });

        res.status(200).json({
            image_url: newMeasure.image_url,
            measure_value: newMeasure.measure_value,
            measure_uuid: newMeasure.measure_uuid,
        });
    } catch (error) {
        res.status(500).json({
            error_code: 'SERVER_ERROR',
            error_description: 'An unexpected error occurred',
        });
    }
};

export const confirmMeasure = async (req: Request, res: Response) => {
    try {
        const { measure_uuid, confirmed_value } = req.body;

        if (typeof measure_uuid !== 'string' || typeof confirmed_value !== 'number' || isNaN(confirmed_value)) {
            return res.status(400).json({
                error_code: 'INVALID_DATA',
                error_description: 'Os dados fornecidos no corpo da requisição são inválidos.',
            });
        }

        const measure = await Measure.findOne({ where: { measure_uuid } });

        if (!measure) {
            return res.status(404).json({
                error_code: 'MEASURE_NOT_FOUND',
                error_description: 'Leitura não encontrada.',
            });
        }

        if (measure.has_confirmed) {
            return res.status(409).json({
                error_code: 'CONFIRMATION_DUPLICATE',
                error_description: 'Leitura já confirmada.',
            });
        }

        measure.has_confirmed = true;
        await measure.save();

        return res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error('Erro ao confirmar a leitura:', error);
        return res.status(500).json({
            error_code: 'INTERNAL_SERVER_ERROR',
            error_description: 'Erro ao processar a solicitação.',
        });
    }
};


export const listMeasures = async (req: Request, res: Response) => {
    try {
        const { customer_code } = req.params;
        const { measure_type } = req.query;

        if (measure_type && typeof measure_type === 'string') {
            const validTypes = ['WATER', 'GAS'];
            if (!validTypes.includes(measure_type.toUpperCase())) {
                return res.status(400).json({
                    error_code: 'INVALID_TYPE',
                    error_description: 'Tipo de medição não permitida',
                });
            }
        }

        const whereClause: any = { customer_code };

        if (measure_type && typeof measure_type === 'string') {
            whereClause.measure_type = measure_type.toUpperCase();
        }

        const measures = await Measure.findAll({
            where: whereClause,
            attributes: ['measure_uuid', 'measure_datetime', 'measure_type', 'has_confirmed', 'image_url'],
        });

        if (measures.length === 0) {
            return res.status(404).json({
                error_code: 'MEASURES_NOT_FOUND',
                error_description: 'Nenhuma leitura encontrada',
            });
        }

        return res.status(200).json({
            customer_code,
            measures,
        });
    } catch (error) {
        console.error('Erro ao listar as medições:', error);
        return res.status(500).json({
            error_code: 'INTERNAL_SERVER_ERROR',
            error_description: 'Erro ao processar a solicitação.',
        });
    }
};
