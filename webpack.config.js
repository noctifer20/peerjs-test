const webpack = require('webpack');
const path = require('path');

const ENV = process.env.NODE_ENV || 'development';


module.exports = {
    entry: './src/js/index.js',

    output: {
        path: path.resolve(__dirname),
        publicPath: '/',
        filename: 'together.js'
    },

    // plugins: ENV === 'production' ? [
    //     new webpack.NoErrorsPlugin(),
    //     new webpack.optimize.DedupePlugin(),
    //     new webpack.optimize.OccurenceOrderPlugin(),
    //     new webpack.DefinePlugin({
    //         'process.env': JSON.stringify({ NODE_ENV: ENV })
    //     }),
    //     new webpack.optimize.UglifyJsPlugin({
    //         compress: { warnings: false }
    //     }),
    //     function() {
    //         this.plugin('done', function(statsData) {
    //
    //             var stats = statsData.toJson();
    //
    //             if (!stats.errors.length) {
    //                 var htmlFileName = "index.html";
    //                 var html = fs.readFileSync(path.join(__dirname, htmlFileName), "utf8");
    //
    //                 var htmlOutput = html.replace(
    //                     /src="\/bundle(?:\.[\d\w]+)?\.js"/i,
    //                     "src=\"/" + stats.assetsByChunkName.main[0] + "\"");
    //                 fs.writeFileSync(
    //                     path.join(__dirname, '', htmlFileName),
    //                     htmlOutput);
    //             }
    //         });
    //     }
    // ] : [
    //
    //     function() {
    //         this.plugin('done', function() {
    //             var htmlFileName = "index.html";
    //             var html = fs.readFileSync(path.join(__dirname, htmlFileName), "utf8");
    //
    //             var htmlOutput = html.replace(
    //                 /src="\/bundle(?:\.[\d\w]+)?\.js"/i,
    //                 "src=\"/bundle.js\"");
    //
    //             fs.writeFileSync(
    //                 path.join(__dirname, '', htmlFileName),
    //                 htmlOutput);
    //         });
    //     }
    // ],

  module: {
    loaders: [
      {
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'es2016', 'es2017', 'stage-1']
        }
      },
      {
        test: /\.css$/,
        loader:'style-loader!css-loader'
      },
      {
        test: /\.(jpe?g|png|ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
        use: 'base64-inline-loader?limit=1000&name=[name].[ext]'
      }
    ]
  },

    devtool: 'source-map',

    resolve: {
        extensions: ['.js']
    }
};
