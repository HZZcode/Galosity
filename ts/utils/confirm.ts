const confirmDialog = document.getElementById('confirm') as HTMLDialogElement;
const confirmText = document.getElementById('confirm-text') as HTMLParagraphElement;
const confirmYes = document.getElementById('confirm-yes') as HTMLButtonElement;
const confirmNo = document.getElementById('confirm-no') as HTMLButtonElement;

export function confirm(text: string) {
    return new Promise<boolean>((resolve, _) => {
        confirmText.innerText = text;
        confirmDialog.showModal();
        [confirmYes, confirmNo].forEach(button => button.blur());

        confirmYes.onclick = () => {
            confirmDialog.close();
            resolve(true);
        };
        confirmNo.onclick = () => {
            confirmDialog.close();
            resolve(false);
        };
        confirmDialog.addEventListener('close', () => resolve(false));
    });
}