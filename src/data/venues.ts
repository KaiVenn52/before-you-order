import type { VenueType } from '../domain/types';

export const venueTypes: VenueType[] = [
  {
    id: 'kopitiam',
    name: { en: 'Kopitiam', zh: '咖啡店／茶室' },
    description: {
      en: 'Local coffee, toast, noodles and rice stalls in one familiar everyday stop.',
      zh: '一站就能找到咖啡、烤面包、面食和饭类，最适合日常随便吃。',
    },
    searchQuery: 'kopitiam coffee shop 咖啡店 茶室 Malaysia',
    tags: { en: ['Everyday', 'Lots of choice'], zh: ['日常', '选择多'] },
  },
  {
    id: 'cafe-brunch',
    name: { en: 'Cafe & brunch', zh: 'Cafe／早午餐' },
    description: {
      en: 'Coffee, breakfast plates, pasta, cakes and a slower place to sit and talk.',
      zh: '适合咖啡、早餐、意面和甜点，也适合坐久一点聊天。',
    },
    searchQuery: 'cafe brunch 咖啡馆 早午餐 Malaysia',
    tags: { en: ['Coffee', 'Relaxed'], zh: ['咖啡', '休闲'] },
  },
  {
    id: 'zi-char',
    name: { en: 'Zi char / Dai chow', zh: '煮炒／大炒' },
    description: {
      en: 'Wok dishes, rice and shared plates when everyone wants something different.',
      zh: '炒饭炒面和多人共享菜都有，适合一家人或朋友各点各的。',
    },
    searchQuery: 'zi char dai chow chu char 煮炒 大炒 中式餐馆 Malaysia',
    tags: { en: ['Sharing', 'Wok dishes'], zh: ['适合多人', '镬气'] },
  },
  {
    id: 'mamak',
    name: { en: 'Mamak', zh: '嘛嘛档' },
    description: {
      en: 'Roti, thosai, nasi kandar and drinks—fast, affordable and often open late.',
      zh: 'Roti、印度煎饼、Nasi kandar 和饮料，方便实惠，通常营业到很晚。',
    },
    searchQuery: 'mamak restaurant 嘛嘛档 Malaysia',
    tags: { en: ['Affordable', 'Late night'], zh: ['实惠', '宵夜'] },
  },
  {
    id: 'hawker-centre',
    name: { en: 'Hawker centre', zh: '小贩中心／美食中心' },
    description: {
      en: 'Many independent stalls together, useful when a group cannot agree on one cuisine.',
      zh: '不同档口集中在一起，同行的人想吃不同菜系时最方便。',
    },
    searchQuery: 'hawker centre food court 小贩中心 美食中心 Malaysia',
    tags: { en: ['Big variety', 'Groups'], zh: ['种类多', '适合多人'] },
  },
  {
    id: 'malay-warung',
    name: { en: 'Malay warung', zh: '马来餐档／Warung' },
    description: {
      en: 'Local rice, lauk and made-to-order dishes with an easy neighbourhood feel.',
      zh: '可选饭菜、家常配菜和现点现炒，适合想吃本地马来餐的时候。',
    },
    searchQuery: 'warung makan kedai makan Malay food 马来餐档 Malaysia',
    tags: { en: ['Local', 'Rice & lauk'], zh: ['本地', '饭菜'] },
  },
  {
    id: 'banana-leaf',
    name: { en: 'Banana leaf restaurant', zh: '香蕉叶饭／印度餐馆' },
    description: {
      en: 'Curries, vegetables, rice and breads with plenty of vegetarian-friendly combinations.',
      zh: '咖喱、蔬菜、米饭和饼类选择丰富，也比较容易找到素食组合。',
    },
    searchQuery: 'banana leaf rice South Indian restaurant 香蕉叶饭 印度餐馆 Malaysia',
    tags: { en: ['Curries', 'Vegetarian-friendly'], zh: ['咖喱', '素食友好'] },
  },
  {
    id: 'steamboat-bbq',
    name: { en: 'Steamboat & BBQ', zh: '火锅／烧烤' },
    description: {
      en: 'A longer, social meal where the table cooks and shares together.',
      zh: '适合聚餐和慢慢吃，大家可以一起煮、一起分享。',
    },
    searchQuery: 'steamboat hotpot BBQ 火锅 烧烤 Malaysia',
    tags: { en: ['Social', 'Dinner'], zh: ['聚餐', '晚餐'] },
  },
  {
    id: 'bakery-dessert',
    name: { en: 'Bakery & dessert', zh: '面包店／甜品店' },
    description: {
      en: 'Bread, pastries, cakes and drinks when a full meal feels unnecessary.',
      zh: '不想吃正餐时，可以选择面包、糕点、蛋糕和饮料。',
    },
    searchQuery: 'bakery dessert cafe 面包店 甜品店 Malaysia',
    tags: { en: ['Light', 'Sweet'], zh: ['轻食', '甜点'] },
  },
  {
    id: 'vegetarian-restaurant',
    name: { en: 'Vegetarian restaurant', zh: '素食餐馆' },
    description: {
      en: 'Search by restaurant first, then decide among familiar rice, noodle and curry dishes there.',
      zh: '先找到附近素食餐馆，再到店里从熟悉的饭、面和咖喱中选择。',
    },
    searchQuery: 'vegetarian restaurant 素食餐馆 素食馆 Malaysia',
    tags: { en: ['Meat-free', 'More options'], zh: ['素食', '选择更多'] },
  },
];
