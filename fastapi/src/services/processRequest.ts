import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { ColumnNormalizer } from "./columnNormalizer";

const execFileAsync = promisify(execFile);
const cwd = (file: string) => path.join(process.cwd(), file);

const hasItems = (v: unknown): boolean =>
  Array.isArray(v) ? v.length > 0 : !!v && typeof v === "object" && Object.keys(v).length > 0;

export class ProcessRequest {
  async runMarkdownConversion(input: string, output: string): Promise<void> {
    await this.runQuery(["pandoc", "-f", "markdown-yaml_metadata_block", input, "-o", output]);
  }

  // Mirrors subprocess.run(capture_output=True): non-zero exit still returns stdout;
  // failure to launch returns the joined command.
  async runQuery(command: string[]): Promise<string> {
    const [bin, ...args] = command;
    try {
      const { stdout } = await execFileAsync(bin, args, { maxBuffer: 256 * 1024 * 1024 });
      return stdout;
    } catch (e: any) {
      if (typeof e?.code === "number" && typeof e.stdout === "string") return e.stdout;
      return command.join(" ");
    }
  }

  async renderJson(command: string[]): Promise<Record<string, any>> {
    const normalizer = new ColumnNormalizer();
    await this.runQuery(command);

    const response = JSON.parse(await fs.readFile(cwd("report.json"), "utf-8"));
    normalizer.collectColumnName(response, "summary");
    normalizer.collectColumnName(response, "results");
    if (hasItems(response["query_performance"])) normalizer.collectColumnName(response, "query_performance");
    if (hasItems(response["failures"])) normalizer.collectColumnName(response, "failures");
    return response;
  }

  private async renderMarkdownFile(command: string[], filename: string): Promise<string> {
    const input = cwd(`${filename}.md`);
    const output = cwd(`${filename}.html`);
    await this.runQuery(command);
    await this.runMarkdownConversion(input, output);
    return fs.readFile(output, "utf-8");
  }

  renderGithub(command: string[]) {
    return this.renderMarkdownFile(command, "github-report");
  }

  renderMarkdown(command: string[]) {
    return this.renderMarkdownFile(command, "report");
  }

  async renderHtml(command: string[]): Promise<string> {
    await this.runQuery(command);
    return fs.readFile(cwd("index.html"), "utf-8");
  }

  async renderPdf(command: string[]): Promise<string> {
    const input = cwd("report.pdf");
    const output = cwd("report.html");
    await this.runQuery(command);
    await this.runQuery(["pdftohtml", input, output]);
    return fs.readFile(output, "utf-8");
  }
}
