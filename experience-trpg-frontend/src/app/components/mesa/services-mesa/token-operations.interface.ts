import { TokenDto } from "../../../dtos/mapaEstado.dto";

export interface TokenOperations {
  createTokenSprite(key: string, token: TokenDto): void;
  instantiateToken(key: string, token: TokenDto): void;
}