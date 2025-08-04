const confirmDialog = document.getElementById('confirm') as HTMLDialogElement;
const confirmText = document.getElementById('confirm-text') as HTMLParagraphElement;
const confirmYes = document.getElementById('confirm-yes') as HTMLButtonElement;
const confirmNo = document.getElementById('confirm-no') as HTMLButtonElement;

export let isConfirming = false;

export function confirm(text: string) {
    return new Promise<boolean>(resolve => {
        confirmText.innerText = text;
        confirmDialog.showModal();
        isConfirming = true;

        confirmYes.blur();
        confirmNo.blur();

        confirmYes.onclick = () => {
            confirmDialog.close();
            isConfirming = false;
            resolve(true);
        };
        confirmNo.onclick = () => {
            confirmDialog.close();
            isConfirming = false;
            resolve(false);
        };
        confirmDialog.addEventListener('close', () => {
            isConfirming = false;
            resolve(false);
        });
    });
}