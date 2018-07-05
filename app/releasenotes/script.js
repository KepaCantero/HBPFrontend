(() => {
  let handleScroll = event => {
    let target = $(event.target.hash);
    if (!target.length) return;
    event.preventDefault();

    setTimeout(
      () =>
        $('main').animate(
          {
            scrollTop: target.offset().top - $('.release-notes').offset().top
          },
          150,
          () => {
            target.focus();
            location.hash = event.target.hash.substr(1);
          }
        ),
      1
    );
    return false;
  };
  $(() => {
    // generate release links list
    let releaseNotesList = $('.release-notes-list');

    $('[version]').each((i, e) => {
      let version = e.getAttribute('version');
      let newid = `version-${version.replace(/\./g, '_')}`;
      e.id = newid;
      releaseNotesList.append(`<li><a href="#${e.id}">${version}</a></li>`);
    });

    // animate scroll to elements
    $('a[href^="#version"]').click(handleScroll);
  });
})();
