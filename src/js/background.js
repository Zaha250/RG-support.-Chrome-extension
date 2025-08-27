chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "searchUserProfile",
        title: "Найти пользователя \"%s\"",
        contexts: ["selection"]
    });
});

// Создание вкладки с переходом по собранному URL
function openUserProfileTab(hostname, query) {
    const url = `https://${hostname}/demo/dispetcher/users/?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url, active: false });
}

// Находим кнопку "отписаться" и извлекаем URL клиента
function extractSenderAndDomain(selectedText) {
    const links = document.querySelectorAll('.letter-body__body-content a');
    const targetLink = Array.from(links).find(a =>
        a.textContent.toLowerCase().includes('отписаться')
    );

    const url = targetLink?.href;
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    return { hostname, selectedText, targetLink };
}

// Обработчик клика по контекстному меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (
        info.menuItemId !== "searchUserProfile" ||
        !info.selectionText ||
        !tab?.id
    ) {
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [info.selectionText],
        func: extractSenderAndDomain,
    }, (results) => {
        const result = results?.[0]?.result;
        console.log({result})
        if (result?.hostname && result?.selectedText) {
            openUserProfileTab(result.hostname, result.selectedText);
        } else {
            console.warn('Не удалось извлечь sender или domain с текущей страницы');
        }
    });
});
