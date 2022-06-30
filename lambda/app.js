const { execSync } = require('child_process');
const { join } = require('path');
const { mkdirSync, rmdirSync, existsSync } = require('fs');

const { BUCKET_NAME } = process.env;

function timedCommand(name, command) {
  console.time(name);
  console.debug(name, command);
  let result = null;
  try {
    result = execSync(command).toString()
    console.log(name, result);
  } catch (e) {
    console.error(e.toString());
  }
  console.timeEnd(name);
  return result;
}

function ensureEmptyDir(dir) {
  if (existsSync(dir)) {
    rmdirSync(dir);
  }
  mkdirSync(dir, { recursive: true });
}

const ALLURE = 'node node_modules/allure-commandline/bin/allure';
const RESULT_PREFIX = 'allureResults';
const REPORT_PREFIX = 'allureReports';
const TMP_RESULTS = '/tmp/allure-results';
const TMP_REPORT = '/tmp/allure-reports';

async function handler(event) {
  console.log('EVENT', { event });
  const { input } = event;
  if (!input) {
    throw new Error('Input must be passed: {input: string}!');
  }

  console.log('INIT TMP FOLDERS', TMP_RESULTS, TMP_REPORT);
  ensureEmptyDir(TMP_RESULTS);
  ensureEmptyDir(TMP_REPORT);

  const inputPrefix = input.includes(RESULT_PREFIX) ? input : join(RESULT_PREFIX, input);
  console.log('CHECKING RESULTS ON S3:', inputPrefix);

  const objects = timedCommand(
    "LIST OBJECTS",
    `aws s3api list-objects --bucket ${BUCKET_NAME} --prefix ${inputPrefix}`
  );

  if (!objects) {
    throw new Error('There are not results in S3!');
  }

  console.log('DOWNLOADING FILES FROM S3', inputPrefix, 'TO', TMP_RESULTS);
  timedCommand(
    "DOWNLOAD OBJECTS",
    `aws s3 sync s3://${join(BUCKET_NAME, inputPrefix)} ${TMP_RESULTS}`
  );

  console.log('GENERATING ALLURE REPORT');
  timedCommand('ALLURE', `${ALLURE} generate -o ${TMP_REPORT} ${TMP_RESULTS}`);

  const outputPrefix = join(REPORT_PREFIX, input.replace(RESULT_PREFIX, ''));
  console.log('UPLOADING ALLURE REPORT TO S3:', outputPrefix);
  timedCommand(
    "UPLOADING OBJECTS",
    `aws s3 sync ${TMP_REPORT} s3://${join(BUCKET_NAME, outputPrefix)}`
  );

  return { output: outputPrefix };
}

module.exports = { handler };