<template>
  <div id="svg-wrap">
    <svg :style="this.background" viewBox="-540 -540 1080 1080" id="svg-holder"></svg>
    <canvas id="svg-canvas"></canvas>
    <img id="svg-image"/>
  </div>
</template>

<script>
  export default {
    name:'Chart',
    props:['swatches', 'tracks'],
    mounted(){
      this.draw();
    },
    watch:{
      tracks:function(){
        this.draw();
      }
    },
    computed:{
      background: function(){
        let bg = '#fff';
        this.swatches.forEach( swatch => {
          if(swatch.name == 'LightMuted'){
            bg = swatch.getHex();
          }
        });
        return `stroke-width: 0px; background-color: ${bg};`;
      }
    },
    methods:{
      draw(){
        console.info(this.tracks);
        let svgWrap = document.querySelector('#svg-holder');
        while (svgWrap.firstChild) {
          svgWrap.removeChild(svgWrap.firstChild);
        }
        let spacing = this.tracks.length/100;
        let radians = 360*(this.tracks.length/100);
        this.tracks.map((track, index)=>{
          let segment = document.createElementNS('http://www.w3.org/2000/svg', "circle");
          // add attrs
          let scale = (100*spacing)+((25*index)+20);
          let width = Math.floor(Math.random()*(scale%13)+5);
          let attrs = {
            cx:540,
            cy:540,
            r:(scale+width+spacing)+5*index,
            'stroke-width':width,
            'fill':'transparent',
            stroke:`hsl(${(360*track.features.hsl[0])},${(track.features.hsl[1]*100)+'%'},${(track.features.hsl[2]*100)+'%'})`,
            'stroke-dasharray':`${(scale/radians)*100} ${100+scale}`,
            style:`transform:rotate(${Math.floor(Math.random()*360)}deg); transform-origin:50% 50%;`
          }
          Object.keys(attrs).forEach(item=>{
            segment.setAttribute(item, attrs[item])
          });
          svgWrap.append(segment);
        });
      }
    }
  }
</script>
<style></style>
