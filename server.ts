import { Application, Router } from "http://deno.land/x/oak@v12.6.1/mod.ts";

const app = new Application();
const ROOT = `${Deno.cwd()}/`;

app.use(async (ctx) => {
  try {
    await ctx.send({
      root: ROOT,
      index: "index.html",
    });
  } catch {
    ctx.response.status = 404;
    ctx.response.body = "404 File not found";
  }
});


const port = parseInt(Deno.env.get("PORT") ?? "8080");
const options: any = { port };


if (Deno.args.length >= 3) {
  options.secure = true
  options.cert = await Deno.readTextFile(Deno.args[1])
  options.key = await Deno.readTextFile(Deno.args[2])
}

console.log(`Oak static server running on port ${options.port} for the files in ${ROOT}`);

await app.listen(options);
