function NoOpNeutralElementColors() {
  // Token simulation's NeutralElementColors overwrites every shape with white fill
  // on mode enter. We keep user-applied colors from the color picker instead.
}

NoOpNeutralElementColors.$inject = [];

export default {
  __init__: [ 'neutralElementColors' ],
  neutralElementColors: [ 'type', NoOpNeutralElementColors ]
};
