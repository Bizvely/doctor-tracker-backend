// পরের ধাপগুলোতে নিজস্ব error ছোড়ার জন্য (যেমন 401, 404)
export class ApiError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}
