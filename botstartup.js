require('dotenv').config();
const botconfig= require('./config.json');
const request = require('request');
const tmi = require('tmi.js');
const fs = require('fs');
var channelListJSON = fs.readFileSync("./channels.json");
var channelList = JSON.parse(channelListJSON);
const DEFAULT_COOLDOWN={
    DEFAULT_TITLE_COOLDOWN:60000,
    DEFAULT_GAME_COOLDOWN:5000,
    DEFAULT_LIVE_COOLDOWN:60000*6
  }
let AT = ""

const client= new tmi.Client(botconfig);

client.on('chat',  (channel,user,message,self)=> {
    if(self) return
    let messageparts = message.split(" ")
    if(message==='!ping'){
        client.say(channel,"Pong!")
    }

    if(message.startsWith("!removeme")){
        if(messageparts.length!=2) return
        let event = messageparts[1]
        if(event.search(/^live$|^offline$|^title$|^game$/)===-1) return client.say(channel,"Wrong event!")
         if(!channelList.kian[event].includes(user.username)){
            return client.say(channel,"You are not registered")
         }            
        channelList.kian[event].splice(channelList.kian[event].indexOf(user.username),1)
         toJSON()
    }
    if(message.startsWith("!notifyme")){
        if(messageparts.length!=2) return
        let event = messageparts[1]
        if(event.search(/^live$|^offline$|^title$|^game$/)===-1) return client.say(channel,"Wrong event!")
         if(channelList.kian[event].includes(user.username)){
             return client.say(channel,"You are already registered")
         }
         channelList.kian[event].push(user.username)
         toJSON()
    }
});
const toJSON = ()=>{
    cooldown=true;
    fs.writeFile("./channels.json", JSON.stringify(channelList), function writeJSON(err) {
        if (err) return console.log(err);
    });
}

async function initializeAT(){
    const options={
        url: process.env.TOKEN_URL,
        json:true,
        body:{
            client_id:process.env.CLIENT_ID,
            client_secret:process.env.CLIENT_SECRET,
            grant_type:'client_credentials'
        }
    };
    let response = await postrequest(options)
    AT=response?.access_token
};

async function doChannelAPIUpdate(){
    const options={
        url:process.env.GET_LIVE + "helltf",
        method:'GET',
        headers:{
            'Client-ID':process.env.CLIENT_ID,
            'Authorization': 'Bearer ' + AT
        }
    };
        let response= await asyncrequest(options)
        response.data.forEach((streamer)=>{
            if(streamer.broadcaster_login==="helltf"){
                updateChannelProperty({
                            title:streamer.title,
                            game_id:streamer.game_id,
                            live:streamer.is_live 
                })
            }
        })
    }
async function updateChannelProperty(channelinfo){
    for(let[key,value] of Object.entries(channelinfo)){
        if(value!=undefined&&channelstatus[key]!=undefined&&value!=channelstatus[key]){
            notify(key,value,"helltf")
            channelstatus[key]=value
        }
    }
}
const getGameByID=async(id)=>{
    const options = {
      url: "https://api.twitch.tv/helix/games?id="+id,
      method:'GET',
      headers:{
          'Client-ID':process.env.CLIENT_ID,
          'Authorization': 'Bearer ' + AT
      }
  }
  return new Promise((resolve,reject)=>{
    request.get(options,(err,res,body)=>{
      if(err){
         reject(err)
         console.log(err)
      }
      console.log(body)
      let parsed = JSON.parse(body)
      if(parsed.data.length===0) resolve(undefined) 
      resolve(parsed?.data[0]?.name)
    })
  })
  }

async function notify(key, value,streamer){
    if(key==="game_id")  key="game";
    if(key==="game") value = await getGameByID(value)
    if(value===undefined) return;
    switch(key){
        case "live": 
          if (value===true) {
            beginmessage = `PagMan 👉  ${streamer} went live DinkDonk `;
            break
          }
            beginmessage = `FeelsBadMan 👉  ${streamer} went offline DinkDonk `; break;
        default: beginmessage = `PagMan 👉  ${streamer} has changed the ${key} to ${value} DinkDonk `; break;
    }
    if(channelstatus[`${key}_cooldown`]===true) return
    if (key==="live"&&!value) key ="offline"
    let messages = splitUserMessage(channelList.kian[key],beginmessage)
    messages.forEach((message)=>{client.say("helltf",`${message}`)})
    if(key==="offline") key = "live"
    channelstatus[`${key}_cooldown`] = true
    setTimeout(()=>{
        channelstatus[`${key}_cooldown`]=false
    },DEFAULT_COOLDOWN[`DEFAULT_${key.toUpperCase()}_COOLDOWN`])
}

const splitUserMessage=(users,beginmessage)=>{
    let messageArray=[]
    let currentmessage=beginmessage
    for(user of users){
      if((currentmessage+" "+user).length<500){
        currentmessage+=" "+user
      }else{
        messageArray.push(currentmessage)
        currentmessage= beginmessage+ " "+user
      }
    }
    messageArray.push(currentmessage)
    return messageArray
  }

async function connect(){
    await client.connect()
    await initializeAT()
    initChannelstatu()
    setInterval(doChannelAPIUpdate,2*1000);
    setInterval(initializeAT,3300000)
}
let channelstatus = {
    title:undefined,
    live:undefined,
    game_id:undefined,
    game_cooldown:false,
    live_cooldown:false,
    title_cooldown:false
}
const initChannelstatu=async()=>{
    const options={
        url:process.env.GET_LIVE + "helltf",
        method:'GET',
        headers:{
            'Client-ID':process.env.CLIENT_ID,
            'Authorization': 'Bearer ' + AT
        }
    };
        let response= await asyncrequest(options)
        response.data.forEach((streamer)=>{
            if(streamer.broadcaster_login==="helltf"){
                channelstatus.game_id=streamer.game_id
                channelstatus.title=streamer.title
                channelstatus.live=streamer.live
            }
        })
}
const postrequest= async(options)=>{
    return new Promise((resolve,reject)=>{
      request.post(options,(err,res,body)=>{
        if(err){
          reject(err);
        }
        else{
          resolve(body)
        }
      })
    })
  }

const asyncrequest=async(options)=>{
    return new Promise((resolve,reject)=>{
      request.get(options,(err,res,body)=>{
        if(err){
          reject(err);
        }
        else{
          try{
            resolve(JSON.parse(body))
          }catch(err){
            console.log(err)
            resolve(undefined)
          }
        }
      })
    })
  }
  connect()