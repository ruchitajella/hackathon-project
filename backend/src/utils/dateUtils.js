// Day count = business days (Mon–Fri), weekends excluded
// Documented in README as per FR18

function countBusinessDays(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Check if two date ranges overlap
function datesOverlap(start1, end1, start2, end2) {
  return start1 <= end2 && end1 >= start2;
}

// Check if a date is in the future (strictly after today)
function isInFuture(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) > today;
}

module.exports = { countBusinessDays, datesOverlap, isInFuture };