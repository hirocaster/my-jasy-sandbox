#!/usr/bin/env jasy

def getSession():
    session = Session()

    # 依存しているJasyプロジェクトのディレクトリを指定
    session.addProject(Project("../externals/core/"))
    #session.addProject(Project("../externals/jquery/"))
    #session.addProject(Project("../externals/jsrender/"))
    session.addProject(Project("../externals/hogan.js/"))
    session.addProject(Project("."))

    return session

@task
def clean():
    logging.info("Clearing cache...")
    session = getSession()
    session.clearCache()
    session.close()

@task
def build():
    session = getSession()

    # プロジェクトのビルド設定
    session.setField("es5", True)
    session.permutateField("debug")

    # Asset(画像, CSS等)の設定
    resolver = Resolver(session.getProjects())
    resolver.addClassName("benchmark.App")
    assets = Asset(session, resolver.getIncludedClasses()).exportBuild()

    # 起動スクリプトをbuild/loader.jsに出力
    includedByKernel = storeKernel("build/loader.js", session, assets=assets)

    # Asset以外に必要な静的ファイルをビルドディレクトリにコピーする
    for staticFile in ["index.html", "whiskers.js", "jade.js", "haml.js", 'swig.pack.min.js']:
        updateFile("source/%s" % staticFile, "build/%s" % staticFile)

    for staticFile in ["jsrender/jsrender.js"]:
        updateFile("../externals/%s" % staticFile, "build/%s" % staticFile)

    # 最適化オプションを指定
    optimization = Optimization("variables", "declarations", "blocks", "privates")
    formatting = Formatting()

    # 起動後に最初に実行されるスクリプトを指定
    bootCode = "window.APP = new benchmark.App();window.APP.boot();"

    # 設定ごとにbuild/benchmark-{{ hexdiget }}.jsというファイルを出力する
    for permutation in session.getPermutations():

        # 依存しているクラスを解決
        resolver = Resolver(session.getProjects(), permutation)
        resolver.addClassName("benchmark.App")
        resolver.excludeClasses(includedByKernel)

        # 必要なクラスのみ圧縮して書き出し
        classes = Sorter(resolver, permutation).getSortedClasses()
        compressedCode = storeCompressed("build/app-%s.js" % permutation.getChecksum(), classes,
            permutation=permutation, optimization=optimization, formatting=formatting, bootCode=bootCode)

    session.close()
