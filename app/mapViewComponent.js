import React, { Component } from 'react';
import * as firebase from "firebase";
import MapView from 'react-native-maps';

const Database = require('./database.js')
const styles = require('./styles.js')
const ReactNative = require('react-native');

import {
  View,
  Text,
  Image,
  ActionSheetIOS
} from 'react-native';

const {
  AppState
} = ReactNative

class MapViewComponent extends Component {
  constructor(props) {
    super(props)

    this.state = {
      markers: [],
      lastPosition: 'unknown',
      gpsTrackingActive: false,
      followsUserLocation: false
    }
  }

  // viewDidLoad
  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
    this._handleAppStateChange('active')
    this.startTrackingLocation()
  }

  // viewDidUnload
  componentWillUnmount() {
    this.stopTrackingLocation()
    Database.stopListening()
  }

  _handleAppStateChange = (appState) => {    
    if (appState == "active") { // viewDidAppear
      Database.listenToUsers(this.onOtherUserUpdatedLocation)
    }
    else if (appState == "inactive" || appState == "background") { // viewDidDisappear
      Database.stopListening()
    }
  }

  // This is called with lat & lng being nil if a marker gets removed
  onOtherUserUpdatedLocation = (userId, lat, lng, timestamp, twitterUsername) => {
    let foundExisting = -1
    let coordinatesProvided = !(lat == null && lng == null)
    let coordinate = null

    if (coordinatesProvided) {
      coordinate = {latitude: parseFloat(lat), longitude: parseFloat(lng)}
    }

    for (let i = 0; i < this.state.markers.length; i++) {
      if (this.state.markers[i]["key"] == userId) {
        if (coordinatesProvided) {
          this.state.markers[i]["coordinate"] = coordinate
        }
        foundExisting = i
      }
    }

    if (foundExisting > 0 && !coordinatesProvided) {
      // we have to remove this marker from our list
      // as the user disabled their location sharing
      console.log("Removing the marker here")
      this.state.markers.splice(foundExisting, 1)
    }

    if (coordinatesProvided && foundExisting == -1) {
      let profilePictureUrl = "https://twitter.com/" + twitterUsername + "/profile_image?size=bigger"
      if (profilePictureUrl) {
        profilePictureUrl = profilePictureUrl.replace(" ", "") // with no space, we at least get a nice profile picture
      }
      this.state.markers.push({
        coordinate: coordinate,
        key: userId,
        title: twitterUsername,
        description: "fastlane guy",
        profilePicture: profilePictureUrl
      })
    }
    console.log("updating markers here")

    // So that react re-renders
    this.setState({ markers: this.state.markers })
    console.log(this.state.markers)
  }

  // Location tracking
  watchID: ?number = null;

  startTrackingLocation = () => {
    console.log("starting location listening")
    this.setState({gpsTrackingActive: true })

    this.watchID = navigator.geolocation.watchPosition((position) => {
      var lastPosition = JSON.stringify(position);
      this.setState({gpsTrackingActive: true })
      this.state.lastPosition = lastPosition

      let userId = this.props.userId

      Database.setUserLocation(userId, 
          position.coords.latitude + "", 
          position.coords.longitude + "", 
          position.timestamp + "")
    },
    (error) => console.log(error),
    {enableHighAccuracy: true});
  }

  stopTrackingLocation = () => {
    console.log("Stop tracking location")
    this.setState({gpsTrackingActive: false })
    navigator.geolocation.clearWatch(this.watchID)
    let userId = this.props.userId
    Database.hideUser(userId)
  }

  toggleLocationTracking = () => {
    if (this.state.gpsTrackingActive) {
      this.stopTrackingLocation()
    } else {
      this.startTrackingLocation()
    }
  }

  didTapMoreButton = () => {
    let buttons = [
      (this.state.gpsTrackingActive ? "Stop sharing location" : "Start sharing location"), 
      "Jump to my location",
      "Logout", 
      "Cancel"
    ]

    ActionSheetIOS.showActionSheetWithOptions({
      options: buttons,
      cancelButtonIndex: buttons.length - 1
    },
    (buttonIndex) => {
      this.setState({ clicked: buttons[buttonIndex] });
      switch (buttonIndex) {
        case 0:
          this.toggleLocationTracking()
          break
        case 1:
          this.setState({followsUserLocation: true})
          break
        case 2:
          this.stopTrackingLocation()
          Database.stopListening()
          this.logout()
          this.props.navigator.pop()
          break
        case 3:
          // Cancel, nothing to do here
          break
      }
    });
  }

  async logout() {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.log(error);
    }
  }

  openTwitterProfile = (twitterUsername) => {
    console.log("Open Twitter profile: " + twitterUsername)
    // This will open up the Twitter profile

    urls = [
      "tweetbot://" + twitterUsername + "/user_profile/" + twitterUsername, // always prefer Tweetbot
      "https://twitter.com/" + twitterUsername
    ]
    for (let i = 0; i < urls.length; i++) {
      let url = urls[i]
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          return Linking.openURL(url);
        }
      }).catch(err => console.error('An error occurred', err));
    }
  }

  unfollowUserLocation = () => {
    this.setState({followsUserLocation: false})
  }

  render() {
    return (
      <View style={styles.container}>
        <MapView
          initialRegion={{
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 1.322,
            longitudeDelta: 0.721,
          }}
          onRegionChange={this.unfollowUserLocation}
          showsMyLocationButton={false} // setting this to true doesn't work
          showsUserLocation={this.state.gpsTrackingActive}
          followsUserLocation={this.state.followsUserLocation}
          style={styles.map}
        >
          {this.state.markers.map(marker => (
            <MapView.Marker
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
              onCalloutPress={() => this.openTwitterProfile(marker.title)}
              key={marker.key}
            >
              <Image
                source={{uri: marker.profilePicture}}
                style={styles.mapMarker}
              />
            </MapView.Marker>
          ))}
        </MapView>
        <Text style={styles.gpsSender} onPress={this.didTapMoreButton}>
          {(this.state.gpsTrackingActive?"📡":"👻")}
        </Text>
        <View style={styles.statusBarBackground} />
      </View>
    );
  }
}

module.exports = MapViewComponent
