import { check } from 'express-validator';

export const validateMeasure = [
    check('image').isBase64().withMessage('Invalid image format'),
    check('customer_code').isString().withMessage('Customer code must be a string'),
    check('measure_datetime').isISO8601().withMessage('Invalid datetime format'),
    check('measure_type').toUpperCase().isIn(['WATER','GAS',]).withMessage('Invalid measure type'),
];
