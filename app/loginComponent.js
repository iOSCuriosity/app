import React, { Component } from "react";

import Firestack from "react-native-firestack";
const firestack = new Firestack();

const styles = require("./styles.js");

const MapViewComponent = require("./mapViewComponent");
const Database = require("./database.js");

var Buglife = require('react-native-buglife');

import {
  View,
  Image,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  AlertIOS,
  Text,
  TouchableOpacity,
  Keyboard,
  AppState
} from "react-native";

class LoginComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: "",
      password: "",
      loading: true,
      waitingForFirebase: true
    };

    // Check if the user is already logged in
    ref = this;

    firestack.auth.listenForAuth(function(evt) {
      if (evt.authenticated) {
        ref.pushMapView(ref, evt);
        ref.finishLoading();
      } else {
        // we can instantly stop loading
        ref.setState({ loading: false });
        ref.setState({ waitingForFirebase: false });
      }
    });
  }

  appIsOpen() {
    return AppState.currentState == "active";
  }

  pushMapView(ref, evt) {
    let nav = ref.props.navigator;
    let userId = evt.user.uid;
    pushOptions = {
      component: MapViewComponent,
      passProps: {
        title: "Map",
        userId: userId
      }
    };

    // used to be able to reply to questions
    Buglife.setUserEmail(evt.user.email);

    if (ref.state.waitingForFirebase) {
      // since the user is already logged in, we don't want
      // to check again if a Twitter account is set
      // Making the app faster :rocket:
      nav.push(pushOptions);
    } else {
      ref.askForTwitterUser(userId, function() {
        nav.push(pushOptions);
      });
    }
    ref.finishLoading();
  }

  componentWillMount() {
    firestack.analytics.logEventWithName("pageView", {
      screen: "LoginComponent"
    });
    firestack.analytics.logEventWithName("openLoginView");
  }

  async signup(email, pass) {
    this.setState({ loading: true });
    ref = this;
    firestack.auth
      .createUserWithEmail(email, pass)
      .then(userSession => {
        let userId = userSession.uid;
        console.log("Account created with ID: " + userId);
      })
      .catch(error => {
        this.setState({ loading: false });
        console.log(error);
        Alert.alert("Registration error", error.description);
      });
  }

  async login(email, pass) {
    this.setState({ loading: true });
    ref = this;
    firestack.auth
      .signInWithEmail(email, pass)
      .then(userSession => {
        let userId = userSession.uid;
        console.log("Logged In for user with ID: " + userId);
        // Loading the map is handled on the listener
      })
      .catch(error => {
        console.log(error);
        this.setState({ loading: false });
        Alert.alert("Login Error", error.rawDescription);
      });
  }

  async forgotPassword(email) {
    if (email.length == 0) {
      Alert.alert(
        "No email address provided",
        "Please enter your email address in the 'email' field and press 'Forgot password' again"
      );
      return;
    }
    this.setState({ loading: true });
    ref = this;
    firestack.auth
      .sendPasswordResetWithEmail(email)
      .then(res => {
        this.setState({ loading: false });
        Alert.alert(
          "Success",
          "Check your inbox for further instructions, it might take a few minutes until the email arrives."
        );
      })
      .catch(error => {
        this.setState({ loading: false });
        console.log(error);
        Alert.alert("Error", error.description);
      });
  }

  // This method will add a delay, call it only on success
  finishLoading() {
    setTimeout(
      function() {
        ref.setState({ loading: false });
        ref.setState({ waitingForFirebase: false });
      },
      500
    ); // enable the buttons later for a smoother animation
  }

  askForTwitterUser(userId, successCallback) {
    ref = this;
    Database.getUser(userId, function(value) {
      // First, check if there is an existing twitter username
      if (value != null && !!value.twitterUsername) {
        successCallback();
        return;
      }

      AlertIOS.prompt(
        "Twitter username or your name",
        "The name will be shown next to your marker. Please use your Twitter username if you have one, as it will be used to fetch your profile picture.\n\nIf you don't have a Twitter account, just enter your real name",
        [
          {
            text: "OK",
            onPress: function(twitterUsername) {
              twitterUsername = twitterUsername.replace("@", "");
              Database.setUserTwitterName(userId, twitterUsername);
              ref.askForTwitterUser(userId, successCallback); // to ensure the input is valid
            }
          }
        ],
        "plain-text"
      );
    });
  }

  onPressRegister = () => {
    this.signup(this.state.email, this.state.password);
  };

  onPressLogin = () => {
    this.login(this.state.email, this.state.password);
  };

  onPressForgotPassword = () => {
    this.forgotPassword(this.state.email);
  };

  dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  render() {
    return (
      <View style={styles.container} onPress={this.dismissKeyboard}>
        <Image
          source={require("./assets/headerImage.jpg")}
          style={styles.loginHeaderImage}
        >
          <Text style={styles.loginHeaderTitle}>
            wwdc.family
          </Text>
        </Image>
        <TouchableOpacity
          onPress={this.dismissKeyboard}
          style={styles.dismissKeyboardView}
        />
        <TextInput
          style={styles.email}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={email => this.setState({ email })}
          value={this.state.email}
        />
        <TextInput
          style={styles.password}
          placeholder="Password"
          secureTextEntry={true}
          onChangeText={password => this.setState({ password })}
          value={this.state.password}
        />
        <View style={styles.buttonContainer}>
          <Button
            disabled={this.state.loading}
            onPress={this.onPressLogin}
            title="Login"
            style={styles.button}
            accessibilityLabel="Login"
          />
          <View style={{ marginLeft: 40 }} />
          <Button
            disabled={this.state.loading}
            onPress={this.onPressRegister}
            title="Register"
            style={styles.button}
            accessibilityLabel="Signup"
          />
        </View>
        <View style={{ marginTop: 15 }} />
        <Button
          disabled={this.state.loading}
          onPress={this.onPressForgotPassword}
          title="Forgot password"
          style={styles.button}
          accessibilityLabel="Forgot Passowrd"
        />
        <ActivityIndicator
          animating={this.state.loading}
          style={[styles.centering, { height: 80 }]}
          size="large"
        />
      </View>
    );
  }
}

module.exports = LoginComponent;
