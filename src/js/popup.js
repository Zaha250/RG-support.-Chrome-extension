import {renderTemplateList} from "./renderTemplates.js";

function normalizeSearchText(text) {
    return text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

document.addEventListener("DOMContentLoaded", function() {
    renderTemplateList('.list-templates');

    const searchInput = document.querySelector('#template-search');
    const emptyMessage = document.querySelector('.templates-empty');
    const templates = Array.from(document.querySelectorAll('.list-templates__item'), node => ({
        node,
        searchText: normalizeSearchText(node.querySelector('.template__content').textContent)
    }));

    function filterTemplates() {
        const query = normalizeSearchText(searchInput.value);
        let visibleCount = 0;

        for (const {node, searchText} of templates) {
            node.hidden = !searchText.includes(query);
            if (!node.hidden) {
                visibleCount += 1;
            }
        }

        emptyMessage.hidden = visibleCount > 0;
    }

    searchInput.addEventListener('input', filterTemplates);
    filterTemplates();
});
