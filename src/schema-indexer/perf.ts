interface Job {
  totalMs: number;
  lastStartMs: number;
}

const msInMinute = 1000 * 60;

export class Perf {
  jobs: { [job: string]: Job } = {};

  start(job: string) {
    if (!this.jobs[job]) this.jobs[job] = { totalMs: 0, lastStartMs: 0 };
    this.jobs[job].lastStartMs = performance.now();
  }

  end(job: string) {
    this.jobs[job].totalMs += performance.now() - this.jobs[job].lastStartMs;
  }

  report() {
    const totalMs = this.jobs["all"].totalMs;
    console.log("");
    console.log("# PERFORMANCE:");
    console.log(`#  ${"TOTAL".padEnd(30)}${(totalMs / msInMinute).toFixed(3)} min\t(100%)`);
    for (const [job, value] of Object.entries(this.jobs)) {
      if (job == "all") continue;
      console.log(
        `#  ${job.padEnd(30)}${(value.totalMs / msInMinute).toFixed(3)} min\t(${(
          (100 * value.totalMs) /
          totalMs
        ).toFixed(1)}%)`
      );
    }
  }
}
