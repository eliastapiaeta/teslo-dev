export const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error, acceptFile: boolean) => void,
) => {
    if (!file) return callback(new Error('File is empty'), false);

    const fileExtension = file.mimetype.split('/')[1];
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];

    console.log({ fileExtension, file, validExtensions });

    const isValidExtension = validExtensions.includes(fileExtension);

    console.log({ isValidExtension });

    if (validExtensions.includes(fileExtension)) {
        return callback(null, true);
    }

    callback(null, false);
};
