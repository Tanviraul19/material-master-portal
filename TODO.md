# TODO - Short Description autocomplete polishing

- [x] Update `frontend/src/pages/MaterialRequestForm.jsx` Short Description dropdown UI/behavior:

  - [x] Hide empty material codes (never render `[]` when code is null/empty)
  - [x] Make entire row clickable + hover `bg-blue-50` + cursor-pointer + smooth transition
  - [x] Reposition dropdown to be `absolute` attached directly below input with high `z-index`
  - [x] Scroll polish: max height ~320px, `overflow-y-auto`, smooth scrolling; header/footer remain fixed while list scrolls
  - [x] Header should show typed text and right side should show `60 found`
  - [ ] Add keyboard support: Arrow up/down navigation, Enter selects highlighted row, Escape closes dropdown
  - [x] Ensure selecting `[190000013164] HDPE...` saves ONLY `HDPE...` into `formData.description`


- [ ] Verify no changes to duplicate detection, backend routes, formData structure, submit logic, or other fields/pages.

