/* Dingle Heart Safe: Instagram posts for the news page and the home page.
 *
 * LIVE FEED: paste a Behold JSON feed address (https://feeds.behold.so/...)
 * into feedUrl below and the site will load the latest posts straight from
 * Instagram every time a page opens. Until then, or if the live feed cannot
 * be reached, the snapshot of posts below is shown. See DEPLOY.md.
 *
 * Snapshot taken 7 October 2026 from https://www.instagram.com/dingleheartsafe/
 * Images and video are copies saved on this site, so nothing loads from Instagram.
 */
window.DHS_INSTAGRAM = {
  username: 'dingleheartsafe',
  profileUrl: 'https://www.instagram.com/dingleheartsafe/',
  feedUrl: '',
  posts: [
    {
      id: 'Dd6Rp4nKS9e',
      permalink: 'https://www.instagram.com/p/Dd6Rp4nKS9e/',
      timestamp: '2026-09-30',
      type: 'IMAGE',
      caption: 'The financial assistance from @kerrycountycouncil is key to the continued work we do at Dingle HeartSafe. This support means a great deal, so important to be able to give a ‘heart felt’ shout out 🙌',
      media: [
        { type: 'IMAGE', src: 'img/photo-aed-cabinet-800.jpg', srcLarge: 'img/photo-aed-cabinet-1600.jpg', width: 1500, height: 2000,
          alt: 'An illuminated green public access defibrillator cabinet on a wall, with a sign reading Call 112' }
      ]
    },
    {
      id: 'Ddtwj17ii4E',
      permalink: 'https://www.instagram.com/p/Ddtwj17ii4E/',
      timestamp: '2026-09-25',
      type: 'CAROUSEL_ALBUM',
      caption: 'Amazing to see so many members of the community turning up to our CPR and Defibrillator workshop last week. Not only is this vital training, the proceeds for these events help us to maintain the defibs in the local area.\n\nBig shout out to the students at @shudingleireland who gave up their time to get involved and provide the practical training.\n\nBuíochas ó Chroí ❤️',
      media: [
        { type: 'VIDEO', src: 'video/workshop-720.mp4', poster: 'video/workshop-poster.jpg', width: 720, height: 1280,
          alt: 'Video from the CPR and defibrillator workshop: talks, demonstrations and people practising CPR on manikins' },
        { type: 'IMAGE', src: 'img/photo-shu-students-800.jpg', srcLarge: 'img/photo-shu-students-1600.jpg', width: 1600, height: 1200,
          alt: 'Eight nursing students in white tunics who helped run the practical training' },
        { type: 'IMAGE', src: 'img/photo-cpr-training-800.jpg', srcLarge: 'img/photo-cpr-training-1600.jpg', width: 1500, height: 2000,
          alt: 'A workshop participant practises chest compressions on a manikin while two students watch' }
      ]
    },
    {
      id: 'Dcjx-ikqk1Q',
      permalink: 'https://www.instagram.com/p/Dcjx-ikqk1Q/',
      timestamp: '2026-08-27',
      type: 'IMAGE',
      caption: 'Dingle Heart Safe are a passionate group of volunteers based in Dingle, Co Kerry, Ireland. Our goals are to add and maintain lifesaving defibrillators to the Peninsula along with having a Community First Responders group who provide life saving care in conjunction with the National Ambulance Service in response to heart attack, chest pain, stroke and choking call outs.',
      media: [
        { type: 'IMAGE', src: 'img/image-1-800.jpg', srcLarge: 'img/image-1-1600.jpg', width: 1600, height: 900,
          alt: 'The Dingle Heart Safe volunteer team in high-visibility vests, gathered around an AED' }
      ]
    }
  ]
};
