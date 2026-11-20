// Validate every data file against the schema and business rules.
// Used by the daily research agent before committing, and by CI. Exit 1 on any problem.
import { DataError, loadSiteData } from '../src/lib/load.ts';

try {
  const data = loadSiteData();
  console.log(
    `Data OK: ${data.measures.length} measures, ${data.parties.length} parties, ` +
      `${data.glossary.length} glossary terms, ${data.changelog.length} change-log entries. ` +
      `Last checked ${data.meta.lastChecked}.`,
  );
} catch (e) {
  if (e instanceof DataError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
