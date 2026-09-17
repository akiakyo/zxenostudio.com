import { defineConfig } from "vite";

/* Two entries: the public site, and the admin app served at
   admin.zxenostudio.com (see vercel.json for the host rewrite). */
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        admin: "admin/index.html",
      },
    },
  },
});
