declare module 'expo-clipboard' {
  export function getStringAsync(): Promise<string>;
  export function setStringAsync(text: string): Promise<void>;
  export function setString(text: string): void;
}
