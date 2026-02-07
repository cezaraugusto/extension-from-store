declare module 'extract-zip' {
  type Options = { dir: string };
  function extractZip(path: string, options: Options): Promise<void>;
  export default extractZip;
}
