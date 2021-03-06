import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { IMediaFile } from "../../api/models/MediaFile";
import { FileUploadError } from "./classes";
import { FileArgs } from "./fileUtils";
import { collectGarbage } from "./garbageCollector";
import { createHash } from "crypto";
import { markFileToBeDeleted } from "../db/mongoDbService";

export const uploadFileToLocalDisk = function (
  readStream: Readable,
  file: IMediaFile
): Promise<string> {
  return new Promise(function (resolve, reject) {
    if (file.path === undefined) {
      console.error("File path not specified");
      return reject(new FileUploadError("File path not specified"));
    }
    const stream = fs.createWriteStream(file.path);
    const md5sum = createHash("md5");

    stream.on("finish", () => {
      return resolve(md5sum.digest("hex"));
    });
    readStream.on("data", (data) => {
      md5sum.update(data);
    });
    stream.on("error", (error) => {
      console.error(
        `Error writing file to filesystem. Error details:\n${error}`
      );
      return reject(new FileUploadError(error.message));
    });
    stream.on("open", () => readStream.pipe(stream));
  });
};

export const abortFileUpload = async (file: IMediaFile): Promise<boolean> => {
  const x = markFileToBeDeleted(file.id, true);
  collectGarbage(file);
  return true;
};

export const generateFilePath = (fileArgs: FileArgs): string => {
  // todo fix this pathing
  return path.join(
    __dirname,
    `../../../repository/${fileArgs.fileHash}.${fileArgs.fileExtension}`
  );
};

export const generateFileId = (fileArgs: FileArgs): string => {
  return fileArgs.fileHash;
};
