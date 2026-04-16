export function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function computeDashboardData(applications, range) {
  const rangeMap = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
  const days = rangeMap[range];
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  let dates;
  if (days) {
    dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });
  } else {
    const allDates = [];
    applications.forEach((app) => {
      if (app.appliedAt) allDates.push(app.appliedAt);
      app.contacts.forEach((c) => { if (c.sentAt) allDates.push(c.sentAt); });
    });
    if (allDates.length === 0) return { chartData: [], totalApps: 0, totalContacts: 0 };
    allDates.sort();
    const start = new Date(allDates[0] + "T00:00:00");
    const dayCount = Math.ceil((now - start) / 86400000) + 1;
    dates = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  const startDate = dates[0];
  const appMap = Object.fromEntries(dates.map((d) => [d, 0]));
  const contactMap = Object.fromEntries(dates.map((d) => [d, 0]));

  applications.forEach((app) => {
    if (app.appliedAt >= startDate && appMap[app.appliedAt] !== undefined)
      appMap[app.appliedAt]++;
    app.contacts.forEach((c) => {
      if (c.sentAt >= startDate && contactMap[c.sentAt] !== undefined)
        contactMap[c.sentAt]++;
    });
  });

  const chartData = dates.map((d) => ({
    date: d,
    label: new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    applications: appMap[d],
    contacts: contactMap[d],
  }));

  const totalApps = Object.values(appMap).reduce((a, b) => a + b, 0);
  const totalContacts = Object.values(contactMap).reduce((a, b) => a + b, 0);
  return { chartData, totalApps, totalContacts };
}
