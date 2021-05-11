require('dotenv').config();
const botconfig= require('./config.json');
const request = require('request');
const tmi = require('tmi.js');
const fs = require('fs');
const fspromises =require("fs").promises
let channelListJSON = fs.readFileSync("./users.json");
let channelList = JSON.parse(channelListJSON);
let AT = ""
const broadcaster = process.env.BROADCASTER

const DEFAULT_COOLDOWN={
    DEFAULT_TITLE_COOLDOWN:60000,
    DEFAULT_GAME_COOLDOWN:5000,
    DEFAULT_LIVE_COOLDOWN:60000*6
  }

  let channelstatus = {
    title:undefined,
    live:undefined,
    game_id:undefined,
    game_cooldown:false,
    live_cooldown:false,
    title_cooldown:false
}

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
         if(!channelList.broadcaster[event].includes(user.username)){
            return client.say(channel,"You are not registered")
         }            
        channelList.broadcaster[event].splice(channelList.broadcaster[event].indexOf(user.username),1)
        client.say(channel,`Succesfully removed you from ${event} event`)
        console.log(`removed ${user?.username} from ${event}`)
         toJSON()
    }

    if(message.startsWith("!notifyme")){
        if(messageparts.length!=2) return
        let event = messageparts[1]
        if(event.search(/^live$|^offline$|^title$|^game$/)===-1) return client.say(channel,"Wrong event!")
         if(channelList.broadcaster[event].includes(user.username)){
             return client.say(channel,"You are already registered")
         }
         channelList.broadcaster[event].push(user.username)
         client.say(channel,`Succesfully added you to ${event} event`)
         console.log(`added ${user?.username} to ${event}`)
         toJSON()
    }
});

const toJSON = async()=>{
    await fspromises.writeFile("./users.json", JSON.stringify(channelList), function writeJSON(err) {
        if (err) return console.log(err);
    });
     channelListJSON = fs.readFileSync("./users.json");
     channelList = JSON.parse(channelListJSON);
}

async function initializeAT(){
    const options={
        url: "https://id.twitch.tv/oauth2/token",
        json:true,
        body:{
            client_id:process.env.CLIENT_ID,
            client_secret:process.env.CLIENT_SECRET,
            grant_type:'client_credentials'
        }
    };
    try{
      let response = await postrequest(options)
      AT=response?.access_token
    }catch(err){
      console.log(err)
    }

};

async function doChannelAPIUpdate(){
    const live_options={
        url:"https://api.twitch.tv/helix/search/channels?query=" + broadcaster,
        method:'GET',
        headers:{
            'Client-ID':process.env.CLIENT_ID,
            'Authorization': 'Bearer ' + AT
        }
    };
    try {
      let response= await asyncrequest(live_options)
      response.data.forEach((streamer)=>{
          if(streamer.broadcaster_login===broadcaster){
              updateChannelProperty({
                          title:streamer.title,
                          game_id:streamer.game_id,
                          live:streamer.is_live 
              })
          }
      })
    }catch(e){
console.log(e)
    }
  }
async function updateChannelProperty(channelinfo){
    for(let[key,value] of Object.entries(channelinfo)){
        if(value!=undefined&&channelstatus[key]!=undefined&&value!=channelstatus[key]){
            notify(key,value)
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
      let parsed = JSON.parse(body)
      if(parsed.data.length===0) resolve(undefined) 
      resolve(parsed?.data[0]?.name)
    })
  })
  }

async function notify(key, value){
    if(key==="game_id")  key="game";
    if(key==="game") value = await getGameByID(value)
    if(channelstatus[`${key}_cooldown`]===true) return
    if(value===undefined) return;
    if (key==="live"&&!value) key ="offline"

    let emote = process.env[`${key.toUpperCase()}_EMOTE`]
    switch(key){
        case "live": 
            beginmessage = `${emote} 👉 ${broadcaster} has gone live ${emote} 👉 `
            break
        case "offline":
            beginmessage = `${emote} 👉 ${broadcaster} has gone offline ${emote} 👉 `
            break

        case "title":
          beginmessage = `${emote} NEW TITLE! ${emote} 👉 `
          break

        case "game": 
          beginmessage = `${emote} NEW GAME! ${emote} 👉 ${value} 👉`
          break
        }
        channelstatus[`${key}_cooldown`] = true

    let messages = splitUserMessage(channelList.broadcaster[key],beginmessage)
    for await(message of messages){
      if(message===beginmessage) continue
      client.action(broadcaster,`${message}`)
      await timer(2000)
    }

    if(key==="offline") key = "live"

    setTimeout(()=>{
        channelstatus[`${key}_cooldown`]=false
    },DEFAULT_COOLDOWN[`DEFAULT_${key.toUpperCase()}_COOLDOWN`])
}

const splitUserMessage=(users,beginmessage)=>{
    let messageArray=[]
    let currentmessage=beginmessage
    for(user of users){
      if((currentmessage+" "+user).length<480){
        currentmessage+=" "+user
      }else{
        messageArray.push(currentmessage)
        currentmessage= beginmessage+ " "+user
      }
    }
    messageArray.push(currentmessage)
    return messageArray
  }

const initChannelstatus=async()=>{
    const live_options={
        url:"https://api.twitch.tv/helix/search/channels?query=" + broadcaster,
        method:'GET',
        headers:{
            'Client-ID':process.env.CLIENT_ID,
            'Authorization': 'Bearer ' + AT
        }
    };
        let response= await asyncrequest(live_options)
        response.data.forEach((streamer)=>{
            if(streamer.broadcaster_login===broadcaster){
                channelstatus.game_id=streamer.game_id
                channelstatus.title=streamer.title
                channelstatus.live=streamer.is_live
            }
        })
}
const postrequest= async(options)=>{
    return new Promise((resolve,reject)=>{
      request.post(options,(err,res,body)=>{
        err ? reject(err) : resolve(body)
      })
    })
  }

const asyncrequest=async(options)=>{
    return new Promise((resolve,reject)=>{
      request.get(options,(err,res,body)=>{
        if(err) reject(err);
          try{
            resolve(JSON.parse(body))
          }catch(err){
            console.log(err)
            resolve(undefined)
        }
      })
    })
  }

const timer= ms => new Promise(res => setTimeout(res, ms))

async function connect(){
  await client.connect()
  await client.join(broadcaster)
  await initializeAT()
  await initChannelstatus()
  setInterval(doChannelAPIUpdate,5*1000);
  setInterval(initializeAT,3300000)
}

connect()