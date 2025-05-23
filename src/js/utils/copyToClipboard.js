export function copyToClipboard(text) {
    if (!navigator.clipboard) {
        throw new Error('Ваш браузер не поддерживает быстрое копирование, скопируйте вручную');
    }
    navigator.clipboard.writeText(text)
        .then(function() {
            console.log(' Copying to clipboard was successful!');
        }, function(err) {
            console.error('Could not copy text: ', err);
        });
}
