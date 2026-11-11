export const SPACE_TYPES = Object.freeze([
  {id:'living-room',name:'Living Room',image:'/space-selection/living-room.jpg',position:'53% center',description:'A place to gather, unwind, and feel at home.',baseImage:'livingroom.png',mime:'image/png',context:'a living room for relaxation and conversation'},
  {id:'personal-lounge',name:'Personal Lounge',image:'/space-selection/personal-lounge.webp',position:'50% center',description:'A quiet corner for the things you love.',baseImage:'personal-lounge.jpg',mime:'image/jpeg',context:'a personal lounge for quiet individual activities'},
  {id:'tea-room',name:'Tea Room',image:'/space-selection/tea-room.jpg',position:'50% center',description:'A thoughtful space for stillness and ritual.',baseImage:'tea-room.png',mime:'image/png',context:'a tea room for tea and quiet gatherings'},
  {id:'bedroom',name:'Bedroom',image:'/space-selection/bedroom.jpg',position:'58% center',description:'A restful retreat at the end of the day.',baseImage:'bedroom.png',mime:'image/png',context:'a bedroom for rest and sleep'},
  {id:'bathroom',name:'Bathroom',image:'/space-selection/bathroom.jpg',position:'48% center',description:'A moment of calm in your daily routine.',baseImage:'Bathroom.png',mime:'image/png',context:'a bathroom for bathing and personal care'},
  {id:'studio',name:'Studio',image:'/space-selection/studio.jpg',position:'56% center',description:'A space to make, imagine, and explore.',baseImage:'studio.jpg',mime:'image/jpeg',context:'a studio for creative work'},
].map(space => Object.freeze({
  ...space,
  displayImage: `/images/space-bases/${space.baseImage}`,
  generationBaseImage: `/images/space-bases/${space.id === 'living-room' ? 'livingroom-neutral.png' : space.baseImage}`,
})));

export function getSpaceType(id) {
  return SPACE_TYPES.find(space=>space.id===id) || null;
}
