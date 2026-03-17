export class ApiResponse {
  constructor(statusCode, data, message = "OK") {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}
