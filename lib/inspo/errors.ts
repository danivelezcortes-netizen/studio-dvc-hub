export class StorageError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "StorageError";
    this.status = status;
  }
}
