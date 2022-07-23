import * as fs from 'fs';

import { warningHeader } from './warningHeader';

export const writeToFile = async (filePath: string, text: string) => {
  const fileStreamOptions: { encoding: 'utf8'; flags?: string } = { encoding: 'utf8' };

  let append = false;
  if (fs.existsSync(filePath)) {
    append = true;
    fileStreamOptions.flags = 'a';
  }

  const fileStream = fs.createWriteStream(filePath, fileStreamOptions);

  // add the warning header
  if (!append) {
    fileStream.write(warningHeader);
  }

  // write the text
  fileStream.write(text);

  // close the file stream
  await new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.end();
  });
};
