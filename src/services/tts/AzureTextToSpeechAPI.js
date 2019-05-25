/*jshint esversion: 9 */
// class for all the details of a command
const Common = require('@helpers/common'),
  TextToSpeechService = require('@services/TextToSpeechService'),
  auth = require("@auth"),
  rp = require('request-promise'),
  fs = require('fs'),
  xmlbuilder = require('xmlbuilder');  

class AzureTextToSpeechAPI extends TextToSpeechService {

  // name of the service - eg. google, amazon, azure, watson
  get shortname() {
    return "azure";
  }

  // is this API enabled
  get enabled() {
    return auth.tts && auth.tts.azure && auth.tts.azure.enabled; // turn if off by not specifying it in the tts object
  }

  // url to access tts on azure
  get baseUrl() {
    return "https://eastus.tts.speech.microsoft.com/";
  }

  // get the char limit for this service
  get limit() {
    return auth.tts.azure.limit;
  }

  get format() { return "pcm"; }

  get accessToken() { 
    return this.token;
  } 
  set accessToken(value) {
    this.token = value;
  }

  /**
   * [startupTests to check things this API needs to operate]
   *
   * Should exit the process if this is not configured correctly
   */
  async startupTests() {

    const self = this;
    const subscriptionKey = auth.tts.azure.subscriptionKey;
    
    if (!subscriptionKey) {
      console.log('Config variable azure.subscriptionKey for your subscription key is not set.');
      process.exit(1);
    }

    try {
      self.accessToken = await self.getAccessToken(subscriptionKey);
      var v = await self.getVoicesFromAzure(self.accessToken);
      AzureTextToSpeechAPI.voices = self.processVoices(v);
      TextToSpeechService.checkVoiceStructure(AzureTextToSpeechAPI.voices);
    } catch (err) {
      console.log(`Something went wrong: ${err}`);
      process.exit(1);
    }    
    console.log("Loaded the Azure TTS API credentials OK.");    
  }

  /**
   * [buildRequest to the underlying API]
   *
   * @param {*} ssml
   * @param {*} settings
   *
   * @return  {[type]}  [return request object for this API]
   */
  buildRequest (ssml, settings) {

    // Create the SSML request.
    let xml_body = xmlbuilder.create('speak')
        .att('version', '1.0')
        .att('xml:lang', 'en-us')
        .ele('voice')
        .att('xml:lang', 'en-us')
        .att('name', 'Microsoft Server Speech Text to Speech Voice (en-US, Guy24KRUS)')
        .txt(ssml)
        .end();
    // Convert the XML into a string to send in the TTS request.
    let request = xml_body.toString();
    return request;
  }

  /**
   * [getAudioContent from the underlying API]
   *
   * @param {*} request
   * @param {*} callback (err, audio) => {...}
   */
  getAudioContent (request, callback) {

    var self = this;
    let options = {
        method: 'POST',
        baseUrl: self.baseUrl,
        url: 'cognitiveservices/v1',
        headers: {
            'Authorization': 'Bearer ' + self.accessToken,
            'cache-control': 'no-cache',
            'User-Agent': 'AzureTextToSpeechAPI',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'Content-Type': 'application/ssml+xml'
        },
        body: request
    }

    let p = rp(options)
      .on('response', response => {
        if (response.statusCode === 200) {
          //p.pipe(fs.createWriteStream('TTSOutput.wav'));
          callback(null, p);
        }
        else {
          callback(new Error('HTTP ERROR: ' + response.statusCode));
        }
      })
      .on('error', err => callback(err));
    return p;
  }

  getVoices() {
    return AmazonTextToSpeechAPI.voices;
  }

  getVoicesFromAzure(accessToken) {
    let options = {
      method: 'GET',
      url: 'https://eastus.tts.speech.microsoft.com/cognitiveservices/voices/list',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      transform: body => JSON.parse(body),
      transform2xxOnly: true
    };

    let p = rp(options)
      .then(response => { return response; })
      .catch(err => Common.error(err));
    return p;
  }  

  processVoices(voices) {

    var v = [];

    for ( var index in voices ) {
      var voice = voices[index];

      var map = this.voiceMap ? this.voiceMap[voice.ShortName] : null;

      var n = {
        provider:    this.shortname,
        voice:       voice.ShortName,
        code:        voice.Locale,
        translate:   map ? map.translate : voice.Locale.substring(0,2),
        gender:      map ? map.gender : voice.Gender.substring(0,1),
        voice_alias: map ? map.alias : null,
        language:    map ? map.language : voice.Locale
      };

      v.push(n);
    }

    return v;
  }

  async getAccessToken(subscriptionKey) {
    let options = {
      method: 'POST',
      uri: 'https://eastus.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey
      }
    };
    return rp(options);
  }  
}

module.exports = AzureTextToSpeechAPI;