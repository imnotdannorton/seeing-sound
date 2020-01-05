<template>
  <main>

    <div  v-if="this.swatches.length == 0" class="upload" @drop.prevent="handleDrop" @dragover.prevent>
      <h1>UPLOAD AN IMAGE</h1>
    </div>
    <div class="src-wrap" @drop.prevent="handleDrop" @dragover.prevent>
      <div class="source-img" ref="srcImg"> </div>
      <ul>
        <li v-for="(swatch, index) in this.swatches"  v-bind:key="index">
          <div v-bind:style="colorize(swatch.getHex())"></div>
        </li>
      </ul>
    </div>

    <!-- <ul id="top_tracks" v-if="Object.keys(this.tracks).length > 0" >
      <li>Your Top Songs</li>
      <li v-for="(track, key) in this.tracks"  v-bind:key="key">
        <div v-bind:style="paint(track)"></div>
        {{track.name}}
      </li>
    </ul> -->

    <div class="list-wrap">
      <!-- <span>{{Object.keys(this.top_tracks).length}}</span> -->
      <Chart v-if="this.matched_tracks.length > 0" :tracks="this.matched_tracks" :swatches="this.swatches"/>
      <ul id="top_tracks" v-if="this.matched_tracks.length > 0" >
        <!-- <li>Matched Songs:</li> -->
        <li v-for="track in this.matched_tracks"  v-bind:key="track.id">
          <div v-bind:style="paint(track)"></div>
          <span>{{track.name}}</span>
        </li>
      </ul>
      <button v-if="this.swatches.length > 0 && Object.keys(this.top_tracks).length == 0" @click="spotifyAuth">Cool, let's Get your History</button>
      <button v-if="this.matched_tracks.length > 0" @click="createPlaylist">Save to Spotify</button>
      <div id="embed-wrap"></div>
    </div>
    <!-- <ul id="compare_tracks" v-if="Object.keys(this.compare_tracks).length > 0" >
      <li>Top songs of the decade</li>
      <li v-for="(track, key) in this.compare_tracks"  v-bind:key="key">
        <div v-bind:style="paint(track)"></div>
        {{track.name}}
      </li>
    </ul> -->


  </main>

</template>

<script>
import Vibrant from 'node-vibrant';
import map from '../components/HueKeys';
import axios from 'axios';
import Chart from '../components/chart';
export default {
  name: 'Home',
  components:{Chart},
  props: {
    msg: String
  },
  data:function(){
    return {
      swatches:[],
      scopes:'user-top-read,playlist-modify-private,ugc-image-upload',
      client_id:'6cc5f35a16924bde8f2e4ced1d424601',
      redirect_uri:'http://localhost:8080',
      top_tracks:{},
      compare_tracks:{},
      matched_tracks:[],
      token:null,
      spotifyProvider:null,
      username:'',
      bgColor:''

    }
  },
  mounted() {
    this.token = window.location.hash.substr(1).split('&')[0].split("=")[1]
    if (this.token) {
      // alert(this.token)

      window.opener.spotifyCallback(this.token)
    }
  },
  computed:{
    tracks: function(){
      return this.top_tracks
    }
  },
  methods:{
    colorize(hex){
      let height = (100/this.swatches.length)+'vh'
      let style = `background:${hex}; height:${height}; width:100%;`;
      return style
    },
    setProvider(provider){
      this.spotifyProvider = provider;
    },
    spotifyAuth(){
      let fetchFeatures = this.getFeatures;
      let spotifyProvider = this.spotifyProvider;
      let setTrackInfo = this.setTrack;
      let setProvider = this.setProvider;
      let popup = window.open(`https://accounts.spotify.com/authorize?client_id=${this.client_id}&response_type=token&redirect_uri=${this.redirect_uri}&scope=${this.scopes}&show_dialog=true`, 'Login with Spotify', 'width=800,height=600')
      window.spotifyCallback = (payload) => {
        popup.close()
        this.token = payload
        spotifyProvider = axios.create({
          baseURL: 'https://api.spotify.com/v1/',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${payload}`
          }
        });
        setProvider(spotifyProvider);
        // get all the songs we can!
        let terms = ['long_term', 'short_term', 'medium_term'];
        terms.forEach((term)=>{
          spotifyProvider.get(`me/top/tracks?limit=50&time_range=${term}`).then(response => {
            // trackObj = {};
            let ids = response.data.items.map(item => item.id).join(",")
            response.data.items.map(item => {
              setTrackInfo(item, 'top_tracks');
            } );
            fetchFeatures(ids, spotifyProvider, 'top_tracks');
          });
        })

        // compare against playlist 37i9dQZF1DX0BcQWzuB7ZO
        // spotifyProvider.get(`playlists/37i9dQZF1DWYJ5kmTbkZiz`).then(response => {
        //   // trackObj = {};
        //   console.info('pl response: ', response)
        //   let ids = response.data.tracks.items.map(item => item.track.id).join(",")
        //   response.data.tracks.items.map(item => {
        //     setTrackInfo(item.track, 'compare_tracks');
        //   } );
        //   fetchFeatures(ids, spotifyProvider, 'compare_tracks');
        // });
      }
    },
    setTrack(item, target){
      if(typeof this[target][item.id] == 'undefined'){
          this.$set(this[target], item.id, {});
      }
      let name = item.artists[0].name+' : '+item.name;
      this.$set(this[target][item.id], 'name', name);
    },
    setTrackFeatures(item, target){
      // this.top_tracks[item.id].features = item;
      item.hsl = this.hsl(item);
      // console.info('hsl: ', item.hsl);
      this.$set(this[target][item.id], 'features', item);
    },
    getFeatures(ids, provider, target){
      let setFeatures = this.setTrackFeatures;
      let match = this.matchTracks
      if(provider){
        provider.get(`audio-features/?ids=${ids}`)
          .then(response => {
            let features = response.data.audio_features
            features.map(item => setFeatures(item, target));
            // console.info('features: ', features);
            match();
          });
      }
    },
    createPlaylist(){
      let provider = this.spotifyProvider;
      let updatePlaylist = this.updatePlaylist;
      let now = new Date();
      let plName = 'Synesthsia ' + now.getTime();
      provider.post(`me/playlists`,
        {
          name:plName,
          public:false
        })
        .then(response  => {
          updatePlaylist(response.data.id);
        })
    },
    updatePlaylist(id){
      let provider = this.spotifyProvider;
      let trackUris = this.matched_tracks.map(track => `spotify:track:${track.features.id}`);
      let postPlaylistImage = this.createPlaylistImage;
      let plId = id;
      provider.post(`/playlists/${plId}/tracks`,
        {
          uris:trackUris
        }
      )
        .then(response  => {
          console.info('tracks response', response);
          postPlaylistImage(plId);
        });

    },
    createPlaylistImage(id){
      // try to post image todo
      let updatePlaylistImage = this.updatePlaylistImage;
      let img =  document.getElementById('svg-image');
      let svgNode = document.getElementById('svg-holder');
      let svgData = (new XMLSerializer()).serializeToString(svgNode);
      let canvas = document.getElementById('svg-canvas');
      var xml = svgData;

      // make it base64
      var svg64 = btoa(xml);
      var b64Start = 'data:image/svg+xml;base64,';

      // prepend a "header"
      var image64 = b64Start + svg64;

      // set it as the source of the img element
      img.src = image64;
      img.hidden = true;
      canvas.hidden = true;
      // draw the image onto the canvas
      canvas.width = 1080;
      canvas.height = 1080;
      img.onload = function(){
        canvas.getContext('2d').drawImage(img, 0, 0);
        let imgString = canvas.toDataURL('image/jpeg', .8);
        let trimmedString = imgString.replace('data:image/jpeg;base64,', '');
        console.info(imgString, imgString.length);
        updatePlaylistImage(trimmedString, id);
      }

    },
    updatePlaylistImage(url, id){
      let generateEmbed = this.generateEmbed;
      axios({
        method:'put',
        url: `https://api.spotify.com/v1/playlists/${id}/images`,
        headers: {
          'Content-Type': 'image/jpeg',
          'Authorization': `Bearer ${this.token}`
        },
        data:url
      })
        .then((response, e ) => {
          console.info('img response', response);
          let embed = document.querySelector('#embed-wrap');
          embed.innerHTML = generateEmbed(id);
          if(e){
            console.error('img error', e);
          }
        });
    },
    generateEmbed(id){
      return `<a href="spotify:playlist:${id}"><button class="button">Open in Spotify</button></a>`
      // return `<iframe src="https://open.spotify.com/embed/playlist/${id}" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`
    },
    hsl(obj){
      let attrs = obj;
      if(attrs){
        let l = ((attrs.valence + attrs.liveness)/2);
        let s = (attrs.energy + attrs.danceability)/2;
        // let h = ((attrs.speechiness + attrs.instrumentalness + attrs.danceability)/4);
        let key = attrs.key;
        let h = parseInt(map[key])/360;
        return [h, s, l];
      }else{
        return [0,0,0];
      }
    },
    matchTracks(){
      let swatchesHsl = this.swatches.map(swatch => swatch.getHsl());
      let tracks = this.top_tracks;
      let matched = [];
      Object.keys(tracks).forEach( (key)=>{
        let track = tracks[key]
        let h = track.features.hsl[0];
        let s = track.features.hsl[1];
        let l = track.features.hsl[2];
        // let diff = function(a, b){
        swatchesHsl.forEach((swatch)=>{
          let swatchRGB = Vibrant.Util.hslToRgb(swatch[0], swatch[1], swatch[2]);
          let trackRGB = Vibrant.Util.hslToRgb(h, s, l);
          let colorDiff = Vibrant.Util.rgbDiff(swatchRGB, trackRGB);
          if((parseInt(colorDiff) < 11) && matched.indexOf(track) == -1){
            matched.push(track);
          }

        })
        console.log('matched tracks: ', matched.length);
      });
      this.matched_tracks = matched;
    },
    paint(obj){
      // valence = lightness 0-100%
      // energy = saturation 0-100%
      // liveness = hue 0-360
      let attrs = obj.features;
      if(attrs){
        let hsl = function(){
          let l = ((attrs.valence + attrs.liveness)/2)*100+'%';
          let s = ((attrs.energy + attrs.danceability)/2)*100+'%';
          let key = attrs.key;
          let h = parseInt(map[key]);
          let concat = `hsl(${h},${s},${l})`;
          return concat
        }
        let style = 'background:'+hsl()+'; height:20px; width:20px; display:inline-block; margin:0 5px 5px 0; float:left';
        return style
      }

    },
    parseSwatch(obj){
      // let vibrant = new
      // let palette = this.swatches;
      Vibrant.from(obj).getPalette((err, p) => { this.swatches = p; this.processSwatches(this.swatches);});
      // console.log(vibrant);
      // this.swatches = vibrant.swatches();
    },
    processSwatches(obj){
      const colorsSort = [];
      Object.keys(obj).forEach((swatch)=> {
        console.info(swatch);
        obj[swatch].name = swatch;
        colorsSort.push(obj[swatch])
      });
      // colorsSort.sort((a,b)=>{
      //   console.log(a.population, b.population, b.population < a.population);
      //   return a.population - b.population
      // })
      // this.$set()
      this.swatches = colorsSort;
      if(Object.keys(this.top_tracks).length > 0){
        this.matchTracks();
      }
      console.log('sorted', colorsSort, this.top_tracks);
    },
    handleDrop(e){
      let files = e.dataTransfer.files;
      let img = files[0];
      console.log("image", img)
      let parse = this.parseSwatch;
      let reader = new FileReader();

      reader.readAsDataURL(img);
      reader.onload = (result)=>{
          console.log('load', result, reader.result);
          this.$refs.srcImg.style = 'background-image:url('+reader.result+'); background-position:center; background-size:cover';
          let newImg = new Image(1920,1080);
          newImg.src = reader.result;
          parse(newImg);
      }

    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
button, .button{
  background:#fff;
  border:3px solid #000;
  border-radius:5px;
  transition:background .3s, color .3s;
  padding:12px 24px;
  font-size:16px;
  margin:12px;
}
button:hover{
  background:#000;
  color:#fff;
  cursor: pointer;
}
.upload{
  background: #ddd;
  width: 90%;
  padding: 5%;
}
.source-img{
  width: 94%;
  height: 300px;
  display: inline-block;
  margin: 3%;
}
.src-wrap{
  position: relative;
  width: 48%;
  margin-right: 2%;
  display: inline-block;
}
.list-wrap{
  width: 50%;
  height: 100vh;
  display: inline-block;
  vertical-align: top;
  position: relative;
}
.list-wrap ul{
  width: 50%;
  background: rgba(255, 255, 255, .85);
}
.list-wrap li{
  clear: both;
}
/* .list-wrap li span{
  display: inline-block;
} */
.src-wrap ul{
  position: absolute;
  left:0;
  top:0;
  z-index: -1;
  width: 100%;
}
#svg-wrap{
  position: absolute;
  left: 0;
  top: 0;
  z-index: -1;
  width: 100%;
}
</style>
