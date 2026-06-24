function TextAnnotationPaletteProvider(palette, create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;

  palette.registerProvider(this);
}

TextAnnotationPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'translate'
];

TextAnnotationPaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create;
  const elementFactory = this._elementFactory;
  const translate = this._translate;

  function createTextAnnotation(event) {
    const shape = elementFactory.createShape({ type: 'bpmn:TextAnnotation' });
    create.start(event, shape);
  }

  return {
    'create.text-annotation': {
      group: 'artifact',
      className: 'bpmn-icon-text-annotation',
      title: translate('Create text annotation'),
      action: {
        dragstart: createTextAnnotation,
        click: createTextAnnotation
      }
    }
  };
};

export default {
  __init__: [ 'textAnnotationPaletteProvider' ],
  textAnnotationPaletteProvider: [ 'type', TextAnnotationPaletteProvider ]
};
