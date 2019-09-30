import './aos';
import './background-images';
import './jarallax';
import mrSmoothScroll from './smooth-scroll';
import './mobile-menu';
import './svg-injector';
import mrUtil from './util';
import mrFlatpickr from './flatpickr';

(() => {
  if (typeof $ === 'undefined') {
    throw new TypeError('Medium Rare JavaScript requires jQuery. jQuery must be included before theme.js.');
  }
})();

export {
  mrFlatpickr,
  mrSmoothScroll,
  mrUtil,
};
