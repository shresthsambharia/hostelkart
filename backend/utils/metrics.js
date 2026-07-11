import os from 'os';

export const metrics = {
  activeRequests: 0,
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  slowRequests: 0,
  longestRequest: 0,
  totalResponseTime: 0,
  requestTimestamps: [],
};

export const getRequestsPerMinute = () => {
  const now = Date.now();
  metrics.requestTimestamps = metrics.requestTimestamps.filter((t) => now - t < 60000);
  return metrics.requestTimestamps.length;
};

export const getCpuUsage = () => {
  const cpus = os.cpus();
  if (!cpus || cpus.length === 0) return 0;
  
  let totalMs = 0;
  let idleMs = 0;
  
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalMs += cpu.times[type];
    }
    idleMs += cpu.times.idle;
  });

  const usagePercent = 100 - (idleMs / totalMs) * 100;
  return Number(usagePercent.toFixed(2));
};
