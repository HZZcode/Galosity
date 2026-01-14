const confirmDialog = $('confirm', 'dialog');
const confirmText = $('confirm-text', 'p');
const confirmYes = $('confirm-yes', 'button');
const confirmNo = $('confirm-no', 'button');

export let isConfirming = false;

export const confirm = (text: string) => {
    const { promise, resolve } = Promise.withResolvers<boolean>();

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

    return promise;
};