export interface WalletRepository {
  healthcheck(): Promise<boolean>;
}
