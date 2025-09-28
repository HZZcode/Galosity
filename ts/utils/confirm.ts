const confirmDialog = document.getElementById('confirm') as HTMLDialogElement;
const confirmText = document.getElementById('confirm-text') as HTMLParagraphElement;
const confirmYes = document.getElementById('confirm-yes') as HTMLButtonElement;
const confirmNo = document.getElementById('confirm-no') as HTMLButtonElement;

export let isConfirming = false;

export const confirm = (text: string) => new Promise<boolean>(resolve => {
    const resolveConfirm = (value: boolean) => () => {
        confirmDialog.close();
        isConfirming = false;
        resolve(value);
    };
    
    confirmText.innerText = text;
    confirmDialog.showModal();
    isConfirming = true;

    confirmYes.blur();
    confirmNo.blur();

    confirmYes.onclick = resolveConfirm(true);
    confirmNo.onclick = resolveConfirm(false);
    confirmDialog.addEventListener('close', resolveConfirm(false));
});