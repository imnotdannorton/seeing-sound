<template>
  <main>
    <div id="welcome">
      <h1>Let's see what your favorite music looks like.</h1>
      <button v-if="Object.keys(this.tracks).length == 0" @click="spotifyAuth">Connect to Spotify.</button>
    </div>
    <div class="toggle" v-if="Object.keys(this.tracks).length > 0">
      <button @click="toggleSection('list')" v-bind:class="this.activeTab == 'list' ? 'active':''">Song Spectrum</button>
      <button @click="toggleSection('upload')" v-bind:class="this.activeTab == 'upload' ? 'active':''">Image Playlist</button>
    </div>
    <section id="tracks" v-bind:class="(Object.keys(this.tracks).length > 0  && this.activeTab == 'list') ? 'active':''">
      <h2 v-if="Object.keys(this.tracks).length > 0" >Great taste, here's what we see:</h2>
      <ul id="all_tracks" v-if="Object.keys(this.tracks).length > 0" >
        <!-- <li>Your Top Songs</li> -->
        <li v-for="track in this.colorsort(this.tracks)" v-bind:key="track.features.id">
          <div v-bind:style="paint(track)"></div>
          {{track.name}}
        </li>
      </ul>
      <!-- <details v-if="Object.keys(this.tracks).length > 0">
        <summary>Short Term</summary>

      </details> -->
      <div class="upload" style="text-transform:uppercase; margin:20px 0; cursor:pointer; display:flex; justify-content:center; align-items:center;" @click="toggleSection('upload')">
        <em>Next, Generate a playlist from an image →</em>
      </div>
    </section>
    <section id="playlist" v-bind:class="(Object.keys(this.tracks).length > 0  && this.activeTab == 'upload') ? 'active':''">
      <h3 v-if="this.swatches.length == 0">So, what to listen to today? Pick a photo of your vibe.</h3>
      <div class="upload" @drop.prevent="handleDrop" @dragover.prevent>
        <em>UPLOAD AN IMAGE</em>
        <input type="file" class="file-upload" ref="profileImage" @change="handleDrop"/>
      </div>
      <h3 v-if="this.matched_tracks.length > 0">These {{this.matched_tracks.length}} tracks look like they fit just right. Save them as a playlist and listen wherever you want.</h3>
      <div class="src-wrap" @drop.prevent="handleDrop" @dragover.prevent>
        <div class="source-img" ref="srcImg"> </div>
        <ul>
          <li v-for="(swatch, index) in this.swatches"  v-bind:key="index">
            <div v-bind:style="colorize(swatch.getHex())"></div>
          </li>
        </ul>
      </div>
      <div class="list-wrap">
        <!-- <span>{{Object.keys(this.top_tracks).length}}</span> -->
        <Chart v-if="this.matched_tracks.length > 0" :tracks="this.matched_tracks" :swatches="this.swatches"/>
        <ul id="top_tracks" v-if="this.matched_tracks.length > 0" >
          <!-- <li>Matched Songs:</li> -->
          <li v-for="track in this.matched_tracks"  v-bind:key="track.id">
            <div v-bind:style="paint(track)"></div>
            <span>{{track.name}}</span>
          </li>
          <li><button v-if="this.swatches.length > 0 && Object.keys(this.top_tracks).length == 0" @click="spotifyAuth">Cool, let's Get your History</button>
          <input type="text" v-model="playlistTitle" placeholder="Name This Playlist"/>
          <button v-if="this.matched_tracks.length > 0 && !this.embedUrl" @click="createPlaylist">Save to Spotify</button>

          <a v-if="this.embedUrl" :href="this.embedUrl"><button>Open {{playlistTitle}} In Spotify</button></a></li>
        </ul>
      </div>
    </section>



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
      client_id:process.env.VUE_APP_SPOTIFY_KEY,
      redirect_uri:process.env.VUE_APP_REDIRECT_URI,
      top_tracks:{},
      compare_tracks:{},
      matched_tracks:[],
      short_tracks:[],
      med_tracks:[],
      long_tracks:[],
      recommended_tracks:{},
      token:null,
      spotifyProvider:null,
      username:'',
      bgColor:'',
      merged:false,
      embedUrl:false,
      loading:false,
      activeTab:'list'
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
      return this.top_tracks;
    },
    rec_tracks: function(){
      return this.recommended_tracks;
    }
  },
  methods:{
    toggleSection(string){
      this.activeTab = string;
    },
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
        let terms = [ 'short_term'];
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
          this.$set(this[target], item.id, {'features':{'id':item.id, 'hsl':[0,0,0]}});
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
      let match = this.matchTracks;
      let swatches = this.swatches;
      let merge = this.mergeTracks;
      if(provider){
        provider.get(`audio-features/?ids=${ids}`)
          .then(response => {
            let features = response.data.audio_features
            features.map(item => setFeatures(item, target));
            // console.info('features: ', features);
            if(swatches.length > 0 && target == 'top_tracks'){
              match();
            }
            if(target == 'recommended_tracks'){
              merge();
            }
          });
      }
    },
    mergeTracks(){
      if(!this.merged){
        Object.keys(this.rec_tracks).forEach((key) => {
          this.matched_tracks.push(this.rec_tracks[key]);
        });
        this.merged = true;
      }

    },
    createPlaylist(){
      let provider = this.spotifyProvider;
      let updatePlaylist = this.updatePlaylist;
      let now = new Date();
      let plName = this.playlistTitle || ('Synesthesia ' + now.getTime());
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
      // let embedUrl = this.embedUrl;
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
          generateEmbed(id);
          // embedUrl = embed;
          if(e){
            console.error('img error', e);
          }
        });
    },
    generateEmbed(id){
      this.embedUrl = `spotify:playlist:${id}`;
      // setTimeout(3000, ()=> {
      //
      // })

      // return `spotify:playlist:${id}`
      // return `<iframe src="https://open.spotify.com/embed/playlist/${id}" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`
    },
    hsl(obj){
      let attrs = obj;
      if(attrs){
        let l = ((attrs.valence + attrs.liveness)/2);
        let s = (attrs.energy + attrs.danceability)/2;
        let key = attrs.key;
        let h = parseInt(map[key])/360;
        return [h, s, l];
      }else{
        return [0,0,0];
      }
    },
    colorsort(arr){
      let tracks = [];
      let array = Object.keys(arr);
      array.forEach((item)=>{
        tracks.push(arr[item]);
      });

      // sort by lightness
      let lightnessFilter = tracks.sort((a, b)=>{
          return a.features['hsl'][2] - b.features['hsl'][2];
      })
      // sort by saturation
     let satFilter = lightnessFilter.sort((a, b)=>{
         return a.features['hsl'][1] - b.features['hsl'][1];
     })
      //  sort by Hue
      let hueFilter = satFilter.sort((a, b)=>{
          return a.features['hsl'][0] - b.features['hsl'][0];

      })


      // tracks = lightnessFilter;
      return hueFilter;
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
      // get recommendations
      console.log('GET RECS', this.rec_tracks);
      if(Object.keys(this.rec_tracks).length == 0){
        this.searchSwatch(this.swatches, this.matched_tracks);

      }

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
    searchSwatch(swatches, tracks){
      // TO DO: RECS: https://developer.spotify.com/documentation/web-api/reference/browse/get-recommendations/
      let seed = tracks.slice(0,5).map((track) => track.features.id).join(',');
      let setTrackInfo = this.setTrack;
      let fetchFeatures = this.getFeatures;
      Object.keys(swatches).forEach((key)=>{
        let swatch = swatches[key];
        let hsl = swatch.getHsl();
        // how do we make the hue match
        let targetKey = parseInt(hsl[0]*360);
        let keyLookup = Object.keys(map).map((key) => `${key}:`+parseInt(map[key]));
        let keyQuery = 0;
        keyLookup.forEach((keyHash)=>{
          let vals = keyHash.split(':');
          if(Math.abs(targetKey - parseInt(vals[1])) <= 20){
            keyQuery = vals[0]
          }
        });
        let query = `seed_tracks=${seed}&target_key=${keyQuery}&target_liveness=${hsl[2].toFixed(1)}&target_valence=${hsl[2].toFixed(1)}&target_energy=${hsl[1].toFixed(1)}&target_danceability=${hsl[1].toFixed(1)}&limit=5`;
        let spotifyProvider = this.spotifyProvider;
        spotifyProvider.get(`recommendations?${query}`).then(response => {
          // trackObj = {};
          let ids = response.data.tracks.map(item => item.id).join(",");
          response.data.tracks.map(item => {
            setTrackInfo(item, 'recommended_tracks');
          } );
          fetchFeatures(ids, spotifyProvider, 'recommended_tracks');
        });

      });
      // Object.keys(this.recommended_tracks).forEach((track)=>{
      //   this.matched_tracks.push(track);
      // });
    },
    processSwatches(obj){
      const colorsSort = [];
      // let searchSwatch = this.searchSwatch;
      Object.keys(obj).forEach((swatch)=> {
        obj[swatch].name = swatch;

        colorsSort.push(obj[swatch])
      });
      this.swatches = colorsSort;
      this.recommended_tracks = {};
      this.merged = false;
      if(Object.keys(this.top_tracks).length > 0){
        this.matchTracks();
      }
    },
    handleDrop(e){
      let files = e.dataTransfer ? e.dataTransfer.files:e.target.files;
      let img = files[0];
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
@import url('https://fonts.googleapis.com/css?family=Barlow:400,900&display=swap');
*{
  font-family: 'Barlow', Helvetica, sans-serif;
}
main{
  background: #f7f7f7;
  padding: 0 5vh;
}
#welcome{
  height: 50vh;
  position: relative;
  background: #ffc454;
  padding: 5vh;
  margin:0 -5vh;
}
#welcome h1{
  font-size: 3rem;
  text-transform: uppercase;
  background: transparent;
}
.toggle{
  text-align: center;
  border-bottom: 1px solid #2c3450;
}
.toggle button{
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 3px solid transparent;
  border-radius: 0;
  margin-bottom:-2px;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 1px;
  color:#b9b9b9;
}
.toggle button.active{
  color:#2c3450;
  border-bottom:3px solid #ffc454;
}
.toggle button.active:hover{
  color: #ffc454;
}
#tracks{
  min-height: 50vh;
  transform: translateY(0vh);
  opacity: 0;
  z-index: 12;
  position: relative;
  margin: 0vh 5vh;
  /* display: block; */
  padding: 0px 20px;
  /* clear: both; */
  /* height: auto; */
  /* display: inline-block; */
  transition-delay: .3s;
  transition:transform .2s, opacity .2s;
}
section{
  display: none;
  z-index: 0;
  position: relative;
}
section.active{
  display: block;
}
#tracks h2{
  padding: 10px 0;
}
#tracks.active{
  opacity: 1;
  /* transform:translateY(-20vh); */
  /* margin-bottom: -20vh; */
}
button, .button, #embed-wrap a button, button.button{
  background:#fff;
  border:3px solid #2c3450;
  border-radius:5px;
  transition:background .3s, color .3s;
  padding:12px 24px;
  font-size:16px;
  margin:12px 0;
}
button:hover{
  background:#2c3450;
  color:#fff;
  cursor: pointer;
}
input[type="text"]{
  font-size: 16px;
  border-radius: 2px;
  padding: 5px 10px;
  border: 1px solid;
  width: 80%;
}
input[type="file"]{
  opacity: 0;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}
input[type="file"]:hover{
  cursor: pointer;
}
h4{
  padding: 10vh 15vh;
  text-align: center;
  font-weight: 400;
}
#all_tracks{
  width: 100%;
  margin:0;
  padding: 0;

}

#all_tracks li{
  width:30%;
  clear:both;
  display: inline-block;
  vertical-align: top;
}
h3{
  text-align: center;
  font-size: 2rem;
  padding: 10vh 5vh;
  background: #4adeef;
}
.upload{
  background: #ddd;
  width: 90%;
  padding: 5%;
  display: block;
  clear: both;
  text-align: center;
  font-weight: 400;
  position: relative;
}
.source-img{
  width: 94%;
  height: 50vh;
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
canvas{
  position: absolute;
}
em.loading{
  letter-spacing: 3px;
}
@media (max-width: 600px){
  #all_tracks li{
    width: 100%;
  }
  .list-wrap li{
    font-size: 12px;
  }
  #tracks{
    margin: 0vh 2vh;
    padding:0;
  }
  #tracks.active{
    transform: translateY(0vh);
    margin-bottom: 0vh;
  }
  #svg-wrap{
    position: relative;
    /* margin-bottom: -150px; */
  }
  #top_tracks{
    width: 100%;
  }
  .upload{
    height: 50vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .toggle button{
    font-size: .7rem;
    padding: .8rem;
  }
  main{
    width: calc(100% - 10vh);
  }
}
</style>
