const { S3 } = require('aws-sdk');
const { execSync } = require('child_process');
const { join } = require('path');
const mime = require('mime');
const { statSync, readdirSync, mkdirSync, writeFileSync, rmdirSync, existsSync, readFileSync } = require('fs');

const { BUCKET_NAME } = process.env;

function readDirRecursive(dir) {
  const files = readdirSync(dir);
  for (let i = 0; i < files.length; ++i) {
    const filePath = join(dir, files[i]);
    if (statSync(filePath).isDirectory()) {
      const children = readDirRecursive(filePath);
      files.splice(i, 1, ...children.map(c => join(files[i], c)));
      i--;
    }
  }
  return files;
}

function timedCommand(name, command) {
  console.time(name);
  console.debug(name, command);
  try {
    console.log(name, execSync(command).toString());
  } catch (e) {
    console.error(e.toString());
  }
  console.timeEnd(name);
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

  const s3 = new S3();
  const data = await s3.listObjects({
    Bucket: BUCKET_NAME,
    Prefix: inputPrefix,
  }).promise();

  if (!data.Contents.length) {
    throw new Error('There are not results in S3!');
  }

  for (const file of data.Contents) {
    if (file.Size > 0) {
      const filename = file.Key.replace(inputPrefix, '');
      const tmpfile = join(TMP_RESULTS, filename);
      console.log('DOWNLOADING FILE:', file.Key);
      console.debug({ filename, tmpfile, file });
      const obj = await s3.getObject({
        Bucket: BUCKET_NAME,
        Key: file.Key,
      }).promise();
      console.log('WRITING:', tmpfile, 'WITH BYTES:', obj.ContentLength);
      writeFileSync(tmpfile, obj.Body);
    }
  }

  console.log('GENERATING ALLURE REPORT');
  timedCommand('ALLURE', `${ALLURE} generate -o ${TMP_REPORT} ${TMP_RESULTS}`);

  const outputPrefix = join(REPORT_PREFIX, input.replace(RESULT_PREFIX, ''));
  console.log('UPLOADING ALLURE REPORT TO S3:', outputPrefix);

  const reportFiles = readDirRecursive(TMP_REPORT);
  for (const reportFile of reportFiles) {
    const filePath = join(TMP_REPORT, reportFile);
    const key = join(outputPrefix, reportFile);
    console.log('UPLOADING', filePath, 'TO', key);
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: readFileSync(filePath),
      ContentType: mime.getType(filePath),

    }).promise();
  }

  return { output: outputPrefix };
}

module.exports = { handler };