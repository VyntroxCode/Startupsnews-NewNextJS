/**
 * One-time seed: migrates the 130 hardcoded logo URLs (previously baked directly into
 * src/app/our-partners/page.tsx) into the new `partner_logos` table, and seeds
 * `inner_page_content` with the page's current intro copy — so nothing is lost when the page
 * switches from static JSX to admin-managed data.
 *
 * None of these logos ever had a click-through link in the old static page, so link_url is
 * left NULL for all of them; an admin can add real links from the new Inner Pages admin section.
 *
 * Run once: npx tsx scripts/seed-partner-logos-initial.ts
 */
import { query, queryOne, closeDbConnection } from '@/shared/database/connection';

const INDIAN_PARTNERSHIPS = [
  "https://www.brainwired.in/assets/partners/partner9.webp",
  "https://bsmedia.business-standard.com/_media/bs/img/article/2021-08/17/full/20210817172135.jpg",
  "https://bigbox.ventures/wp-content/uploads/2023/02/Logo-e1675776578358.png",
  "https://wisesndtwu.org/wp-content/uploads/2025/05/Billenium_Divas_logo-1024x714-1.png",
  "https://images.crunchbase.com/image/upload/c_pad,h_160,w_160,f_auto,b_white,q_auto:eco,dpr_1/pw9fgwm55q8tgvqhsrom?ik-sanitizeSvg=true",
  "https://startupflora.com/_next/image?url=%2Fimg%2Fincubators-1.png&w=128&q=75",
  "https://1000logos.net/wp-content/uploads/2021/05/DBS-Bank-logo-500x310.png",
  "https://avatars.githubusercontent.com/u/128216445?s=200&v=4",
  "https://faad.in/logo.svg",
  "https://static-asset.inc42.com/logo/fluid-ventures.png",
  "https://static.wixstatic.com/media/aa50f4_127af2f3cab44b3eac4508e53febb9b5~mv2.png/v1/fill/w_219,h_48,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Fund-Enable-On-Dark-Background%20(1)%20(1).png",
  "https://valuation.fundtq.com/assets/subscription/images/logo.png",
  "https://getvantage.co/assets/img/newpartnerpage/logo/11.png",
  "https://equalifi.org/wp-content/uploads/2025/02/GTM-logo-without-bg.png",
  "https://images.crunchbase.com/image/upload/c_pad,h_160,w_160,f_auto,b_white,q_auto:eco,dpr_1/borgxoakhrmypgofzeli?ik-sanitizeSvg=true",
  "https://www.impactfulpitch.com/assets/ImpactfulPitchLogo.svg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0ztuU93uZ_9EJ3khbqjtSAlfyHkDh3jPbaA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWXi8JpCoX8imCm1zaKnsNnokMDnuCk1sPyQ&s",
  "https://ipventures.in/wp-content/uploads/2022/06/ipv-logo-exits-2021.png",
  "https://investor.legalpay.in/images/ivygrowthlogo.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKWGp1XLOWc_GNrE60uQzR2sOrZegD8twheQ&s",
  "https://www.jitoahmedabad.org/wp-content/uploads/2025/11/JIIF-Logo-1.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsfTmoRcGi-tsMp-BVah79Ay0jlRWNrcwO5g&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSsKyuoUau1BE9L9Hhfe82zdaeE82l_n1Vjw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXdTp6MRRgn60l5FFpY8k7hyt2iItT5wykTw&s",
  "https://media.licdn.com/dms/image/v2/D560BAQGbFmyNLcKQUA/company-logo_200_200/company-logo_200_200/0/1697621175661/millet_yard_logo?e=2147483647&v=beta&t=0lb5-eOyMXndNBv-a9YQyyuqApOHyS_IKVFGsh9OUAQ",
  "https://media.licdn.com/dms/image/v2/D560BAQFzeJLXieqrKw/company-logo_200_200/company-logo_200_200/0/1685355969426/niragacapital_logo?e=2147483647&v=beta&t=XRGiC-YSfdYecTvrTOePmAGqR2W8D5W_qvINzXjgEPc",
  "https://play-lh.googleusercontent.com/u2B29Y-h1RDjFKB4h-lZrvG85q6X-tFHsm3P36tsiFGT2DIrhYSrGZmLIKC-K_UAfq4",
  "https://framerusercontent.com/assets/zqfTCirZzaLralRPFgpzSCqDUf8.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEr_-nimpZgvQGb6KqI4Sd0pMV5HSQEyxweQ&s",
  "https://media.licdn.com/dms/image/v2/D4D0BAQHLlUI0m-LUXQ/company-logo_200_200/company-logo_200_200/0/1686055855675/red_art_works21_logo?e=2147483647&v=beta&t=PrWrTaa8meiT_VmtAkvVlmbNADh9fUIsM66IbnHZpHY",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTeD7KcXcNorsWxgYT0OFS43mQxTK_QyFs0hw&s",
  "https://img-cdn.publive.online/fit-in/640x430/filters:format(webp)/entrackr/media/post_attachments/wp-content/uploads/2023/07/Recur.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuNRxVudVgEMpYXa1xrGhVdx-KyhnUJ6MHFw&s",
  "https://media.licdn.com/dms/image/v2/C4E0BAQHy1S3a_09UuQ/company-logo_200_200/company-logo_200_200/0/1630619853692?e=2147483647&v=beta&t=v6c0bZYztlKGhMJfYZquhWrspoOOO59Qv7GmXOHq46U",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxe9ZwGQeNL_hBfIaMY8fJB-YeSlKxzNqTjQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSIc4UjqDjarSGz2ReM6_Ljthkx5GSENi1EHg&s",
  "https://media.licdn.com/dms/image/v2/C560BAQEOkSapsr8o6g/company-logo_200_200/company-logo_200_200/0/1630580193906/sscbs_innovation_and_incubation_foundation_logo?e=2147483647&v=beta&t=u39cZIq71kjSu8XYmQPcnRl0hgwiFgfWHhDeYPgyAfo",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbJmbCXjWwzmWNgMZ0xRRYkUGYOIqekgbMQQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBLeRXflrZiKbzT27pyxdyY2vvBL6_QCVUaw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfP8JyO1NRbUt3JrovPVbQse0YZIGcK4zaJA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3E2XvKWHU4n9gN75qAyYXcgNDIwJS0H5PVQ&s",
  "https://media.licdn.com/dms/image/v2/C4D0BAQEmwxN8KWEsMQ/company-logo_200_200/company-logo_200_200/0/1678297295856?e=2147483647&v=beta&t=FI2FDiibvnYGlHyjqKTuyNWrm-gutBNG78gfgA8IKiY",
  "https://media.licdn.com/dms/image/v2/D4D0BAQHiFLt7O7jNFw/company-logo_200_200/company-logo_200_200/0/1683697638788/csiworldinfotech_logo?e=2147483647&v=beta&t=khoToCyk_gK0kRf4DEu-r4YFQnGbtcdYRVLcYFVTbDM",
  "https://media.licdn.com/dms/image/v2/C560BAQGI7dI3vIJKxA/company-logo_200_200/company-logo_200_200/0/1630662692731?e=2147483647&v=beta&t=b1ntmzscEcVgzMJvPq_yYz35dgNWt9-C3GSqt6VQDew",
  "https://www.f6s.com/content-resource/media/4840338_6a5aa32184d68ebad505a566ec8bac7316f9eb52.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvXOq01r6jfBnnNU_2Jw2o6R6DWhVFuIflDw&s",
  "https://media.licdn.com/dms/image/v2/D4D16AQEsZNDNGdFmfA/profile-displaybackgroundimage-shrink_200_800/profile-displaybackgroundimage-shrink_200_800/0/1715683271653?e=2147483647&v=beta&t=MYHQukTtvd4J4n4SrAcUjjKABp_cjJGpVzTiCpsXSQo",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhBGyKfHXBEJHl1806u0Bp3K7E7J7SBk4NAQ&s",
  "https://media.licdn.com/dms/image/v2/D4D0BAQGxG-oN6eJKnw/company-logo_200_200/company-logo_200_200/0/1688797105285?e=2147483647&v=beta&t=yDR6xVURwzH6_pd-Fmefo3qlXr7evMth19wXYcVI4Lw",
  "https://pbs.twimg.com/profile_images/1755918270027231232/NKBOwt3q_400x400.jpg",
  "https://i0.wp.com/workie.in/wp-content/uploads/2023/06/Workie-removebg-preview.png?fit=556%2C448&ssl=1",
  "https://images.yourstory.com/cs/images/companies/ftcxidcoxpjrsccs-1713434870074.png?fm=auto&ar=1:1&mode=fill&fill=solid&fill-color=fff",
];

const INTERNATIONAL_EVENTS = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNiTe3Xq2Ljam2IXTM8y8U6Dnsp_p85klJRQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_tUZ54vmHUJeYqzBsictEV8UDxw6q1LNb8A&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuoj6pa6gd3Tf20zHfH_QnRfHMiOI1F9a5Qg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2t1mfDKtG5VhMRIqzK2ILt-553uW0yOLTxg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNQfZ_OZUShxKOPrqtWbtm-xCJVUsnmn9NtQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvgAKx8hzp76yCbX4247R1OgNXXiA_AhnGwg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsTmIzGX0NfxeVIXIqME2g5FCCpFbfudlbTQ&s",
  "https://media.licdn.com/dms/image/v2/C4D0BAQHmyJ_vqcxelg/company-logo_200_200/company-logo_200_200/0/1630581235774/kuwait_fintech_summit_logo?e=2147483647&v=beta&t=nEOEeg0JPd8J9k6IB6AkPpNHVNV_bhWVBNoMTEpCd3c",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0yYIOmQaM0B3OAm_YC4LJHAId43cQP_nLcA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiIEZXpgwO3zQ7fGtEleAhO3xBoIqfB_Yp3w&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjvA0_xqd-b2uEKk52nGNQnbMslV-ZP15E2A&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9S_DMMfAEZuuP7vufWD-DQ6LE_nOjsdSt_A&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP8m_XZXDi1iIM0G4-S2AOjYeBtckoiTcMOw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbQDJ6_18HQN5A-2k_ueSz6OtHJcPsSSAnxQ&s",
];

const INTERNATIONAL_EVENTS_ORGANISERS = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRa59zQf3bgZOvNBVtDUBA3PKtcnCqGWIU5Q&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRC7r2AYOcSZg1W7x2TKD5PWXp0MQuAQlmLOA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSIaHpyrktOMIlolH3aMDuj3wKWgXFrF6Svw&s",
  "https://s3.amazonaws.com/industryevents/organiser/logo/1685/medium/1676384917781.jpg?1676679533",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx_e_smAGbIQgHzaGZIhzUiyk8lS-K0gpI4w&s",
  "https://pbs.twimg.com/profile_images/1643847879331655680/86jlnJD8_400x400.jpg",
  "https://static.wixstatic.com/media/6a3ff5_ee64f6ba94ce46509fa8ecf111fa94a0~mv2.jpeg/v1/fill/w_400,h_400,al_c,q_80/PFrelLTI_400x400.jpeg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdb7wNRdWxhFb6bzfLArRDKJp2MaoWBghtTA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgrh85_mBms8swbJJzWnE4mgyZxvp7rCLXhQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQapOyIn3meLxSWYtDwqquXsFOwpgOhUfRK1A&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSF-BcpmWErgD_Z6lT6AWjqHn5vmvebwQUwUg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMuYqKosWNt8Fyi4NG3_m_mohD-a9c-spNwQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLV1CLZx845o-89hCTYM0u1jLqNay6WWSJTQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRY-z16FqFeKWYsLvUPShrtMPMs6ZTFYHWSCQ&s",
  "https://media.licdn.com/dms/image/v2/C4E0BAQHGw2ancaBFBA/company-logo_200_200/company-logo_200_200/0/1631367594558/magespire_logo?e=2147483647&v=beta&t=fpMmKlDHO0t4zxzu3BG7nCIwfcWM-Q8bG5WUcueBdDU",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6e-2a1rMF2QwQIG29rMHXU-kBMe1BoVXU2w&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxP_4y68IgrKrTHNvLWUO9o4mXEKrMEDYalA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuxlfLuhDDZMagC_CXExrzzQY83wI__JdMAA&s",
  "https://media.licdn.com/dms/image/v2/D560BAQGwXHQPusWlcA/company-logo_200_200/company-logo_200_200/0/1692182908741/scribe_minds_media_logo?e=2147483647&v=beta&t=HaA44GHGi75rYOd1d3XOQOdDXXSd3uaQ1aiCzj2g-vY",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAHmVz0AdK8vfj5Nc2Pmjf0qy2coFqn7R0VQ&s",
  "https://media.licdn.com/dms/image/v2/C4E0BAQHIhUOn9AhgwQ/company-logo_200_200/company-logo_200_200/0/1630572333811/small_business_expo_logo?e=2147483647&v=beta&t=zyk1tijeOXnsWe-S6YGNT3BBxwJbmUn2B1c6ehp-k7g",
  "https://play-lh.googleusercontent.com/iBf31aZjayRQUb1SNVtCgBhCCPKHDsQZ9X68AU4kou21oHvzCwSiJG-oNlo360-JJSM",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpKC9-_iohz3F-uCYBvAquXcbWVhLNAJsEJA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0Jhmxi7OGQW-GO9lSdrgVbRkSOtoK_UOZoA&s",
  "https://static.wixstatic.com/media/9d1042_0c44ba4fee004723bda099e98022a93b~mv2.png/v1/fit/w_2500,h_1330,al_c/9d1042_0c44ba4fee004723bda099e98022a93b~mv2.png",
  "https://s3.amazonaws.com/industryevents/organiser/logo/815/medium/Screenshot_2023-06-04_105510.png?1685840135",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhvkkxYiLsrBfdGrNhJpAjHDzW_j4DjVxLQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-aX8yh67nfBSCF4MxQmPJuoJcE22XDDv0Uw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4WJExv7iExUgU8HPPsQss_vV7H30pbRa_Tg&s",
];

const ECELL_PARTNERSHIPS = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3hy08cfmvi4-DgnLp8Jh1Wz0zx1QO-XmyTQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRb6NjSb8js3bjVM0nJjO9T0LzA7NUgZC_XQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4OyBu8oG3qJ5dAPlnnT3VBVooqvvtBu5QUw&s",
  "https://media.licdn.com/dms/image/v2/C510BAQGEV-A5iy4mDQ/company-logo_200_200/company-logo_200_200/0/1630622076594/ecosocssc_logo?e=2147483647&v=beta&t=iJ50YfXZy0WdCmD6VbAA1gmZZ4fEMPgYsuneLWa84WU",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFsGnWIydTPGI7YRb3cjpEr__Z-9ZPDGykNQ&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLV1CLZx845o-89hCTYM0u1jLqNay6WWSJTQ&s",
  "https://upload.wikimedia.org/wikipedia/en/e/ec/Indian_Institute_of_Management_Udaipur_Logo.png",
  "https://upload.wikimedia.org/wikipedia/en/thumb/1/13/Institute_of_Chemical_Technology_logo.png/250px-Institute_of_Chemical_Technology_logo.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUpzkQBgoVQFg4kXImvLVBKfLQN4oaDP9SGA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQD9vmoXeT5kzf9GVkagzWt7RqIL25kc4IoIA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP9Zrd7JIusUiXHE5GF9ildLGd1xT84TTDmg&s",
  "https://upload.wikimedia.org/wikipedia/en/2/2d/Indian_Institute_of_Technology_Roorkee_Logo.svg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-yfPxdSCg2XmJrRUzPlkh_fCdH9sVp3BNaw&s",
  "https://www.ecell.in/certificate/assets/img/E-Cell%20Logo-Black.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQ21DM2iiQdAdnklMmgi2Jvn8sQaCrvaBH9A&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNi6Ra7NH-IeP2NxeEYr_KKl0PBSZ8LLpHdA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVGNpXQOhpP0O08Oyluos8LHMiI68CrodR7A&s",
  "https://media.licdn.com/dms/image/v2/D4D0BAQF75rMd2SJIXw/company-logo_200_200/company-logo_200_200/0/1728033541155?e=2147483647&v=beta&t=awbPTntdpV9FqALwF_HhfNE1AcKHTgipCEU5uEbTSEE",
  "https://pbs.twimg.com/profile_images/1400477243814645767/8KG7dtMt_400x400.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT20676oJJMPVZx0w-nXtCEcwvjYHB4p_Q5QA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTer8pzGCaqW_OR2h8SZyjtPEPYzyGeTDKB9w&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrdacykrELzmXO6DufcGcNu8AHoO5m8nxtQg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRrtlAip0Mf2OVVowj9v81abgNODcXX-7Zbw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcReQWpNJ8ynqRA8usEVtq73HajndzWXz4LBGA&s",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/960px-IEEE_logo.svg.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdS3Two8vcJ4xNAK2H_1NcjBJ6gQhEMEs39Q&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvR8WAcGoQ9gDValskybsxtSqrdKVdx3e6SA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlZonSmWs64IeN3Y-s6YvcHYKtCPciUoYDew&s",
  "https://media.licdn.com/dms/image/v2/C4D0BAQHdr1RaxRmLCQ/company-logo_200_200/company-logo_200_200/0/1630577771710/abhivyakti_bits_goa_logo?e=2147483647&v=beta&t=rhzEoNfIvk4s6iKMOm2c4P1knlYy-xDLZp_I2DV4Lug",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxAOqKbOtk6AitlURPyXoFH1vunwLrVmpomw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuY71mD_X1AyYSLOmIIICzd7dWT8Ci9-_NuQ&s",
];

const SECTIONS: [string, string[]][] = [
  ['Indian Partnerships', INDIAN_PARTNERSHIPS],
  ['International Events', INTERNATIONAL_EVENTS],
  ['International Events Organisers', INTERNATIONAL_EVENTS_ORGANISERS],
  ['e-Cell Partnerships', ECELL_PARTNERSHIPS],
];

const INTRO_HTML = `
<h2>Trusted by Leading Global Startup &amp; Tech Ecosystems</h2>
<p>In a short span, <strong>StartupNews.fyi</strong> has built partnerships across <strong>24 Countries</strong>, becoming a recognized Media and Ecosystem partner for some of the World's most Influential Startup Events, Innovation Summits and Business Exhibitions.</p>
<p>Our growing Global footprint reflects the trust placed in us by Organizers, Investors, Accelerators, Corporates, and Innovation Leaders who share our commitment to empowering Entrepreneurs and shaping the future of Business.</p>
<p>From Local Communities to International Stages, we continue to connect Startups with opportunities that transcend borders.</p>
`.trim();

async function main() {
  const existing = await queryOne<{ c: number | bigint }>('SELECT COUNT(*) as c FROM partner_logos');
  if (Number(existing?.c || 0) > 0) {
    console.log(`partner_logos already has ${existing?.c} rows — skipping logo seed (already run).`);
  } else {
    let total = 0;
    for (const [section, urls] of SECTIONS) {
      for (let i = 0; i < urls.length; i++) {
        await query(
          'INSERT INTO partner_logos (section, image_url, link_url, sort_order, created_by) VALUES (?, ?, NULL, ?, ?)',
          [section, urls[i], i, 'seed-script']
        );
        total++;
      }
    }
    console.log(`Seeded ${total} partner logos across ${SECTIONS.length} sections.`);
  }

  const existingContent = await queryOne('SELECT page_key FROM inner_page_content WHERE page_key = ?', ['our-partners']);
  if (existingContent) {
    console.log('inner_page_content already has an our-partners row — skipping content seed.');
  } else {
    await query(
      'INSERT INTO inner_page_content (page_key, content_html, updated_by) VALUES (?, ?, ?)',
      ['our-partners', INTRO_HTML, 'seed-script']
    );
    console.log('Seeded inner_page_content for our-partners.');
  }

  await closeDbConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
