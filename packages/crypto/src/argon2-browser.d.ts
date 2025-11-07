declare module 'argon2-browser' {
  export interface Argon2Params {
    pass: string | Uint8Array;
    salt: Uint8Array;
    time: number;
    mem: number;
    parallelism: number;
    hashLen: number;
    raw: true;
  }

  export interface Argon2Result {
    hash: Uint8Array;
    encoded: string;
  }

  export function argon2id(params: Argon2Params): Promise<Argon2Result>;
}
