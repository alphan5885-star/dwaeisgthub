const url = process.env.APP_HEALTH_URL || "http://127.0.0.1:5173/";

try {
  const started = Date.now();
  const response = await fetch(url, { redirect: "manual" });
  const elapsed = Date.now() - started;

  console.log("App health");
  console.log(`- URL: ${url}`);
  console.log(`- Status: ${response.status}`);
  console.log(`- Time: ${elapsed}ms`);

  if (!response.ok && response.status < 300) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error("App health failed");
  console.error(`- URL: ${url}`);
  console.error(`- Error: ${error.message}`);
  process.exitCode = 1;
}
