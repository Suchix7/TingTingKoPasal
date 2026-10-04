declare module "bwip-js" {
  const bwipjs: {
    toCanvas: (
      canvas: HTMLCanvasElement | string,
      options: Record<string, unknown>,
    ) => HTMLCanvasElement;
  };
  export default bwipjs;
}
