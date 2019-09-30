//
// mobile-menu.js
//

import jQuery from 'jquery';

(($) => {
  $('.js-canvas-toggle').on('click', () => {
    $('body').toggleClass('is-mobile-menu-visible');
    if ($('body').hasClass('is-mobile-menu-visible')) {
      $('body').addClass('overflow-hidden');
    } else {
      $('body').removeClass('overflow-hidden');
    }
  });
})(jQuery);
