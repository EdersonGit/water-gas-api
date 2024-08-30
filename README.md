# Projeto Back-end

back-end de um serviço que gerencia a leitura individualizada de
consumo de água e gás.

## Endpoints da API

  - **POST** `/upload`
    - **Headers**:
      - `Content-type: application/json`
    - **Payload**:
      ```json
      {
        "image": "base64",
        "customer_code": "string",
        "measure_datetime": "datetime",
        "measure_type": "WATER" OU "GAS"

      }
      ```
    - **Response Status Code**:
      - `200 Created`: Operação realizada com sucesso.
      - `400 Bad Request`: Os dados fornecidos no corpo da requisição são inválidos.
      - `409 Bad Request`: Já existe uma leitura para este tipo no mês atual.   

- **PATCH** `/confirm`
    - **Headers**:
      - `Content-type: application/json`
    - **Payload**:
      ```json
      {
        "measure_uuid": "string",
        "confirmed_value": integer
      }
      ```
    - **Response Status Code**:
      - `200 Created`: Operação realizada com sucesso.
      - `400 Bad Request`: Os dados fornecidos no corpo da requisição são inválidos.
      - `400 Bad Request`: Leitura não encontrada.
      - `409 Bad Request`: Leitura já confirmada

   - **GET** `/<customer code>/list`
    
    - **Response Status Code**:
      - `200 Created`: Operação realizada com sucesso.
      - `400 Bad Request`: Parâmetro measure type diferente de WATER ou GAS.
      - `404 Bad Request`: Nenhum registro encontrado.   
