import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// This creates the GET and POST handlers that UploadThing needs.
// Place this file at:  app/api/uploadthing/route.ts
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,

  // Optional: override UploadThing config here
  // config: { ... },
});