export interface MakeLaunchOptions {
  scriptName: string;
  promptFilePath: string;
  cwd: string;
}

export interface MakeProvider {
  id: string;
  description: string;
  launch: (options: MakeLaunchOptions) => Promise<number>;
}
